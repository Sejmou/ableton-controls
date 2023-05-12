import { Ableton } from 'ableton-js';
import { TrackManager } from './track-manager';
import { createSongAndSection$ } from './reactive-state/songs-and-sections';
import { createTracksAndTrackGroups$ } from './reactive-state/tracks';
import { combineLatest, mergeMap } from 'rxjs';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const { currentSong$, currentSection$ } = await createSongAndSection$(
    ableton
  );

  combineLatest([currentSong$, currentSection$]).subscribe(console.log);

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

  new TrackManager({
    midiInputPortName: 'BT500S',
    tracks$: tracksForCurrentSong$,
  });
};

main();
