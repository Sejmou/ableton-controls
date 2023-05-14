import { Ableton } from 'ableton-js';
import { CuePoint } from 'ableton-js/ns/cue-point';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
} from 'rxjs';

// This code creates an Observable that emits the current song and section name whenever any of those two change.
// The current song and section names are determined based on locators in the Ableton project.
// Any locator name that starts with # is considered a section start locator. Any other locator name is considered a song locator.
export async function createSongAndSection$(ableton: Ableton) {
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

  const songLocators$ = locators$.pipe(
    map(locators => locators.filter(l => l.type === 'song-start'))
  );

  const currentSongLocator$ = combineLatest([songLocators$, time$]).pipe(
    map(([locators, time]) => getCurrentLocator(locators, time)),
    distinctUntilChanged((prev, curr) => prev?.name === curr?.name)
  );

  const nextSongLocator$ = combineLatest([
    currentSongLocator$,
    songLocators$,
  ]).pipe(
    map(([currentSongLocator, songLocators]) => {
      const currentSongIndex = songLocators.findIndex(
        l => l.name === currentSongLocator?.name
      );
      if (currentSongIndex === songLocators.length - 1) {
        return null;
      }
      return songLocators[currentSongIndex + 1];
    })
  );

  const previousSongLocator$ = combineLatest([
    currentSongLocator$,
    songLocators$,
  ]).pipe(
    map(([currentSongLocator, songLocators]) => {
      const currentSongIndex = songLocators.findIndex(
        l => l.name === currentSongLocator?.name
      );
      if (currentSongIndex === 0) {
        return null;
      }
      return songLocators[currentSongIndex - 1];
    })
  );

  // the section locators for the current song
  const sectionLocators$ = combineLatest([
    locators$,
    currentSongLocator$,
    nextSongLocator$,
  ]).pipe(
    map(([locators, currentSongLocator, nextSongLocator]) =>
      locators.filter(
        l =>
          l.type === 'section' &&
          currentSongLocator &&
          l.time >= currentSongLocator.time &&
          (!nextSongLocator || l.time < nextSongLocator.time)
      )
    )
  );

  const currentSectionLocator$ = combineLatest([sectionLocators$, time$]).pipe(
    map(([locators, time]) => getCurrentLocator(locators, time)),
    distinctUntilChanged((prev, curr) => prev?.name === curr?.name)
  );

  const nextSectionLocator$ = combineLatest([
    currentSectionLocator$,
    sectionLocators$,
  ]).pipe(
    map(([currentSectionLocator, sectionLocators]) => {
      const currentSectionIndex = sectionLocators.findIndex(
        l => l.name === currentSectionLocator?.name
      );
      if (currentSectionIndex === sectionLocators.length - 1) {
        return null;
      }
      return sectionLocators[currentSectionIndex + 1];
    })
  );

  const previousSectionLocator$ = combineLatest([
    currentSectionLocator$,
    sectionLocators$,
  ]).pipe(
    map(([currentSectionLocator, sectionLocators]) => {
      const currentSectionIndex = sectionLocators.findIndex(
        l => l.name === currentSectionLocator?.name
      );
      if (currentSectionIndex === 0) {
        return null;
      }
      return sectionLocators[currentSectionIndex - 1];
    })
  );

  const currentSongAndSection$ = combineLatest([
    currentSongLocator$,
    currentSectionLocator$,
  ]).pipe(
    map(([songMarkers, time]) => getCurrentSongAndSection(songMarkers, time))
  );

  const currentSong$ = currentSongAndSection$.pipe(
    map(({ currentSong }) => currentSong),
    distinctUntilChanged()
  );

  const currentSection$ = currentSongAndSection$.pipe(
    map(({ currentSection }) => currentSection),
    distinctUntilChanged()
  );

  return {
    currentSong$,
    currentSection$,
    currentSectionLocator$,
    nextSectionLocator$,
    previousSectionLocator$,
    currentSongLocator$,
    nextSongLocator$,
    previousSongLocator$,
  };
}

type Locator = {
  name: string;
  time: number;
  type: 'song-start' | 'section';
  cuePoint: CuePoint;
};

async function extractLocatorData(cuePoints: CuePoint[]): Promise<Locator[]> {
  return await Promise.all(
    cuePoints.map(async pt => {
      const name = await pt.get('name');
      const time = await pt.get('time');
      const type = name.startsWith('#') ? 'section' : 'song-start';
      const cuePoint = pt;
      return {
        name: type == 'section' ? name.substring(1) : name,
        time,
        type,
        cuePoint,
      };
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
