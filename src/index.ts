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
        t => t.name === currentSong
      );
      if (
        !soundGroupForCurrentSong ||
        soundGroupForCurrentSong.type !== 'group'
      ) {
        console.warn(`Sounds for current song '${currentSong}' not found`);
        return [];
      }
      const tracksForCurrentSong = soundGroupForCurrentSong.children
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
      withLatestFrom(
        currentSongLocator$,
        currentSectionLocator$,
        currentStartPlaybackOption$
      )
    )
    .subscribe(async ([_, songLocator, sectionLocator, playbackOption]) => {
      const playing = await ableton.song.get('is_playing');
      let currentTime = await ableton.song.get('current_song_time');
      const locator =
        playbackOption === 'current song' ? songLocator : sectionLocator;
      if (locator && !playing) {
        while (locator.time < currentTime) {
          await ableton.song.jumpToPrevCue();
          currentTime = await ableton.song.get('current_song_time');
        }
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
};

main();
