import { Ableton } from 'ableton-js';
import {
  armNextTrack,
  armPreviousTrack,
  getArmedTrackData,
} from './track-arming';
import { createSongAndSection$ } from './reactive-state/songs-and-sections';
import { createTracksAndTrackGroups$ } from './reactive-state/tracks';
import { createMidiInputStream$ } from './midi';
import { combineLatest, filter, mergeMap, withLatestFrom } from 'rxjs';

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

  noteOn$
    .pipe(
      filter(m => m.channel == 1 && m.note == 3),
      withLatestFrom(armedTracks$)
    )
    .subscribe(([_, tracks]) => {
      armNextTrack(tracks);
    });

  noteOn$
    .pipe(
      filter(m => m.channel == 1 && m.note == 2),
      withLatestFrom(armedTracks$)
    )
    .subscribe(([_, tracks]) => {
      armPreviousTrack(tracks);
    });

  // song switching
  noteOn$
    .pipe(
      filter(m => m.channel == 1 && m.note == 1),
      withLatestFrom(nextSongLocator$, armedTracks$)
    )
    .subscribe(([_, l, armedTracks]) => {
      if (l) ableton.song.set('current_song_time', l.time);
      armedTracks.armedTrack?.set('arm', false);
    });

  noteOn$
    .pipe(
      filter(m => m.channel == 1 && m.note == 0),
      withLatestFrom(previousSongLocator$, armedTracks$)
    )
    .subscribe(([_, l, armedTracks]) => {
      if (l) ableton.song.set('current_song_time', l.time);
      armedTracks.armedTrack?.set('arm', false);
    });
};

main();
