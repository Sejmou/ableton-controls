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
} from 'rxjs';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const {
    currentSong$,
    currentSection$,
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
  const playPause$ = noteOn$.pipe(filter(m => m.channel == 2 && m.note == 2));
  playPause$.subscribe(async () => {
    const playing = await ableton.song.get('is_playing');
    ableton.song.set('is_playing', !playing);
  });
};

main();
