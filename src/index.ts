import { Ableton } from 'ableton-js';
import {
  armNextTrack,
  armPreviousTrack,
  getArmedTrackData,
} from './track-arming';
import { createSongAndSection$ } from './reactive-state/songs-and-sections';
import { createTracksAndTrackGroups$ } from './reactive-state/tracks';
import { createMidiInputStream$ } from './midi';
import {
  combineLatest,
  filter,
  mergeMap,
  throttleTime,
  withLatestFrom,
  buffer,
  debounceTime,
  BehaviorSubject,
} from 'rxjs';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const {
    currentSong$,
    currentSection$,
    currentSectionLocator$,
    nextSectionLocator$,
    previousSectionLocator$,
    currentSongLocator$,
    nextSongLocator$,
    previousSongLocator$,
  } = await createSongAndSection$(ableton);

  combineLatest([currentSong$, currentSection$]).subscribe(
    ([song, section]) => {
      if (song)
        console.log(`Current song: ${song}`, section ? `(${section})` : '');
    }
  );

  const midiInputPortName = 'BT500S';
  const { noteOn$ } = await createMidiInputStream$(midiInputPortName);

  // track switching
  const tracksAndTrackGroups$ = await createTracksAndTrackGroups$(ableton);

  const songNameSoundGroupOverride: Record<string, string> = {
    'Slow Dancing (Live)': 'Slow Dancing',
    'Slow Dancing (Studio)': 'Slow Dancing',
  };

  const tracksForCurrentSong$ = combineLatest([
    tracksAndTrackGroups$,
    currentSong$,
  ]).pipe(
    mergeMap(async ([tracks, currentSong]) => {
      const soundsGroupName = 'Guitar Sounds'; // TODO: make this configurable
      const soundGroups = tracks.find(t => t.name === soundsGroupName);
      if (!soundGroups || soundGroups.type !== 'group') {
        console.warn(`Track group '${soundsGroupName}' not found`);
        return [];
      }
      const soundGroupOverride =
        currentSong && songNameSoundGroupOverride[currentSong];
      if (soundGroupOverride)
        console.log(
          `Using sound group '${soundGroupOverride}' for song '${currentSong}'`
        );
      const soundGroupName = soundGroupOverride || currentSong;

      const songSoundGroup = soundGroups.children.find(
        t => t.name === soundGroupName && t.type === 'group'
      );

      const fallbackSoundGroupName = 'Default';
      if (!songSoundGroup) {
        console.warn(
          `Sounds for current song '${currentSong}' not found, using default sounds from '${fallbackSoundGroupName}'`
        );
      }
      const fallbackSoundGroup = soundGroups.children.find(
        t => t.name === fallbackSoundGroupName && t.type === 'group'
      );

      const soundGroup = songSoundGroup || fallbackSoundGroup;

      if (!soundGroup || soundGroup.type !== 'group') {
        // latter check is just to make typescript happy
        console.warn(`No sounds could be found for '${currentSong}'.`);
        return [];
      }

      const tracksForCurrentSong = soundGroup.children.filter(
        t => t.type === 'midiOrAudio'
      );

      return tracksForCurrentSong;
    })
  );

  tracksForCurrentSong$.subscribe(tracks => {
    console.log(
      `Tracks for current song:`,
      tracks.map(t => t.name)
    );
  });

  const currentSongAbletonJsTracks$ = tracksForCurrentSong$.pipe(
    mergeMap(async tracks => {
      const abletonJsTracks = tracks.map(t => t.abletonJsTrack);

      let someTrackArmed = false;
      for (const track of abletonJsTracks) {
        const armed = await track.get('arm');
        if (armed) {
          someTrackArmed = true;
          break;
        }
      }
      if (!someTrackArmed) abletonJsTracks[0].set('arm', true);
      return abletonJsTracks;
    })
  );

  const armedTracks$ = currentSongAbletonJsTracks$.pipe(
    mergeMap(getArmedTrackData)
  );

  const trackSwitch$ = noteOn$.pipe(filter(m => m.channel == 1 && m.note == 1));
  trackSwitch$
    .pipe(buffer(trackSwitch$.pipe(throttleTime(500), debounceTime(500))))
    .pipe(withLatestFrom(armedTracks$))
    .subscribe(async ([messages, tracks]) => {
      if (messages.length > 1) {
        await armPreviousTrack(tracks);
      } else {
        await armNextTrack(tracks);
      }
    });

  // song switching
  const songSwitch$ = noteOn$.pipe(filter(m => m.channel == 1 && m.note == 0));
  songSwitch$
    .pipe(buffer(songSwitch$.pipe(throttleTime(500), debounceTime(500))))
    .pipe(withLatestFrom(nextSongLocator$, previousSongLocator$, armedTracks$))
    .subscribe(([messages, next, previous, armedTracks]) => {
      const locator = messages.length > 1 ? previous : next;
      if (locator) {
        ableton.song.set('current_song_time', locator.time);
        armedTracks.armedTrack?.set('arm', false);
      }
    });

  // play/pause
  // customized so that playback always starts at the beginning of the current song
  const playPause$ = noteOn$.pipe(filter(m => m.channel == 2 && m.note == 2));

  type StartPlaybackOptions = 'current song' | 'current section';
  let startPlaybackOption: StartPlaybackOptions = 'current song';
  const currentStartPlaybackOption$ = new BehaviorSubject<StartPlaybackOptions>(
    startPlaybackOption
  );

  currentStartPlaybackOption$.subscribe(
    option =>
      void console.log(`hitting play button will start playback from ${option}`)
  );

  playPause$
    .pipe(
      buffer(playPause$.pipe(throttleTime(500), debounceTime(500))),
      filter(messages => messages.length == 1), // makes this emit only on single tap
      withLatestFrom(
        currentSongLocator$,
        currentSectionLocator$,
        currentStartPlaybackOption$
      )
    )
    .subscribe(async ([_, songLocator, sectionLocator, playbackOption]) => {
      const playing = await ableton.song.get('is_playing');
      const locator =
        playbackOption === 'current song' ? songLocator : sectionLocator;
      if (!playing) {
        if (!locator) {
          console.warn(
            `attempted to start playback from ${playbackOption}, but no locator was found`
          );
          return;
        }
        console.log(`starting playback from '${locator.name}'`);
        await locator.cuePoint.jump();
      }

      await ableton.song.set('is_playing', !playing);
    });

  playPause$
    .pipe(
      buffer(playPause$.pipe(throttleTime(500), debounceTime(500))),
      filter(messages => messages.length > 1) // makes this emit only on double tap
    )
    .subscribe(() => {
      startPlaybackOption =
        startPlaybackOption === 'current song'
          ? 'current section'
          : 'current song';
      currentStartPlaybackOption$.next(startPlaybackOption);
    });

  // section switching
  const sectionSwitch$ = noteOn$.pipe(
    filter(m => m.channel == 1 && m.note == 3)
  );
  sectionSwitch$
    .pipe(buffer(sectionSwitch$.pipe(throttleTime(500), debounceTime(500))))
    .pipe(withLatestFrom(nextSectionLocator$, previousSectionLocator$))
    .subscribe(([messages, next, previous]) => {
      const locator = messages.length > 1 ? previous : next;
      if (locator) {
        ableton.song.set('current_song_time', locator.time);
      }
    });
};

main();
