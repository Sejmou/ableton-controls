import { Ableton } from 'ableton-js';
// import { TrackManager } from './track-manager';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
} from 'rxjs';
import { CuePoint } from 'ableton-js/ns/cue-point';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

// This code logs the current song and section names to the console whenever they change.
// The current song and section names are determined based on locators in the Ableton project.
// Any locator name that starts with # is considered a section start locator. Any other locator name is considered a song locator.

const main = async () => {
  await ableton.start();

  const initalCuePoints = await ableton.song.get('cue_points');
  const initialTime = await ableton.song.get('current_song_time');

  const locators$ = new BehaviorSubject(
    await extractLocatorData(initalCuePoints)
  );
  ableton.song.addListener('cue_points', async newCuePoints => {
    locators$.next(await extractLocatorData(newCuePoints));
  });

  const time$ = new BehaviorSubject(initialTime);
  ableton.song.addListener('current_song_time', async time => {
    time$.next(time);
  });

  const currentSectionLocator$ = combineLatest([
    locators$.pipe(map(locators => locators.filter(l => l.type === 'section'))),
    time$,
  ]).pipe(
    map(([locators, time]) => getCurrentLocator(locators, time)),
    distinctUntilChanged((prev, curr) => prev?.name === curr?.name)
  );

  const currentSongLocator$ = combineLatest([
    locators$.pipe(
      map(locators => locators.filter(l => l.type === 'song-start'))
    ),
    time$,
  ]).pipe(
    map(([locators, time]) => getCurrentLocator(locators, time)),
    distinctUntilChanged((prev, curr) => prev?.name === curr?.name)
  );

  const currentSongAndSection$ = combineLatest([
    currentSongLocator$,
    currentSectionLocator$,
  ]).pipe(
    map(([songMarkers, time]) => getCurrentSongAndSection(songMarkers, time))
  );

  currentSongAndSection$.subscribe(console.log);

  // new TrackManager(ableton, 'BT500S');
};

main();

type Locator = {
  name: string;
  time: number;
  type: 'song-start' | 'section';
};

async function extractLocatorData(cuePoints: CuePoint[]): Promise<Locator[]> {
  return await Promise.all(
    cuePoints.map(async pt => {
      const name = await pt.get('name');
      const time = await pt.get('time');
      const type = name.startsWith('#') ? 'section' : 'song-start';
      return { name: type == 'section' ? name.substring(1) : name, time, type };
    })
  );
}

function getCurrentLocator(locators: Locator[], time: number) {
  return locators.find(
    (pt, i, arr) => pt.time <= time && (!arr[i + 1] || arr[i + 1].time > time)
  );
}

function getCurrentSongAndSection(
  currentSongLocator?: Locator,
  currentSectionLocator?: Locator
) {
  if (
    currentSongLocator &&
    currentSectionLocator &&
    currentSectionLocator.time < currentSongLocator.time
  ) {
    // This is a section that is before the current song start locator, i.e. it belongs to the previous song
    return { currentSong: currentSongLocator?.name, currentSection: undefined };
  }

  return {
    currentSong: currentSongLocator?.name,
    currentSection: currentSectionLocator?.name,
  };
}
