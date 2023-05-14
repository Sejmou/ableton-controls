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

  const tracksForCurrentSong$ = combineLatest([
    tracksAndTrackGroups$,
    currentSong$,
  ]).pipe(
    mergeMap(async ([tracks, currentSong]) => {
      const soundsGroupName = 'Guitar Sounds'; // TODO: make this configurable
      const soundsGroup = tracks.find(t => t.name === soundsGroupName);
      if (!soundsGroup || soundsGroup.type !== 'group') {
        console.warn(`Track group '${soundsGroupName}' not found`);
        return [];
      }
      const soundGroupForCurrentSong = soundsGroup.children.find(
        t => t.name === currentSong && t.type === 'group'
      );
      if (!soundGroupForCurrentSong) {
        console.warn(
          `Sounds for current song '${currentSong}' not found, using default sounds`
        );
      }
      const fallBackSoundGroup = soundsGroup.children.find(
        t => t.name === 'Default' && t.type === 'group'
      );
      if (!fallBackSoundGroup) {
        console.warn(
          `Default sounds not found. Make sure to add a track group named 'Default' to the selected track group '${soundsGroupName}'`
        );
      }

      const soundGroup = soundGroupForCurrentSong || fallBackSoundGroup;

      if (!soundGroup || soundGroup.type !== 'group') {
        // latter check is just to make typescript happy
        console.warn(`No sounds could be found for '${currentSong}'`);
        return [];
      }

      const tracksForCurrentSong = soundGroup.children
        .filter(t => t.type === 'midiOrAudio')
        .map(t => t.abletonJsTrack);

      let someTrackArmed = false;
      for (const track of tracksForCurrentSong) {
        const armed = await track.get('arm');
        if (armed) {
          someTrackArmed = true;
          break;
        }
      }
      if (!someTrackArmed) tracksForCurrentSong[0].set('arm', true);
      return tracksForCurrentSong;
    })
  );

  const armedTracks$ = tracksForCurrentSong$.pipe(mergeMap(getArmedTrackData));

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
