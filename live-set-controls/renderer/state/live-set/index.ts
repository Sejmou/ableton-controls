import { Ableton } from 'ableton-js';
import { Locator, createSongAndSection$ } from './songs-and-sections';
import { BehaviorSubject, Subject, combineLatest, mergeMap } from 'rxjs';
import {
  GroupTrack,
  MIDIOrAudioTrack,
  createTracksAndTrackGroups$,
} from './tracks';
import { useObservableState } from 'observable-hooks';
import { useEffect, useMemo } from 'react';

const ableton = new Ableton({ logger: console }); // Log all messages to the console
// TODO: do I even need to use Subjects here?
const currentSong$ = new BehaviorSubject('');
const currentSongLocator$ = new Subject<Locator>();
const nextSongLocator$ = new Subject<Locator>();
const previousSongLocator$ = new Subject<Locator>();
const currentSongSounds$ = new BehaviorSubject<MIDIOrAudioTrack[]>([]);
const currentSongPlaybackTracks$ = new BehaviorSubject<
  (MIDIOrAudioTrack | GroupTrack)[]
>([]);
const playing$ = new BehaviorSubject(false);

export function usePlayback() {
  const isPlaying = useObservableState(playing$);

  const returnValue = useMemo(
    () => ({
      resume: () => ableton.song.continuePlaying(),
      start: () => ableton.song.startPlaying(),
      stop: () => ableton.song.stopPlaying(),
      isPlaying,
    }),
    [isPlaying]
  );

  return returnValue;
}

export function useCurrentSong() {
  const currentSong = useObservableState(currentSong$);
  return currentSong;
}

export function useArmableTracksForCurrentSong() {
  const tracks = useObservableState(currentSongSounds$);
  return tracks;
}

export function usePlaybackTracksForCurrentSong() {
  const tracks = useObservableState(currentSongPlaybackTracks$);
  return tracks;
}

export function useSongLocators() {
  const currentSongLocator = useObservableState(currentSongLocator$);
  const nextSongLocator = useObservableState(nextSongLocator$);
  const previousSongLocator = useObservableState(previousSongLocator$);

  const returnValue = useMemo(
    () => ({
      currentSongLocator,
      nextSongLocator,
      previousSongLocator,
    }),
    [currentSongLocator, nextSongLocator, previousSongLocator]
  );

  return returnValue;
}

export function useCurrentSongLocator() {
  const currentSongLocator = useObservableState(currentSongLocator$);
  return currentSongLocator;
}

const sectionLocators$ = new BehaviorSubject<Locator[]>([]);
const currentSectionLocator$ = new Subject<Locator | undefined>();

export function useSectionsOfCurrentSong() {
  const sectionLocators = useObservableState(sectionLocators$);
  const currentSectionLocator = useObservableState(currentSectionLocator$);
  return { sectionLocators, currentSectionLocator };
}

const looping$ = new BehaviorSubject(false);

// DO NOT USE: broken atm
export function useSongSectionLoops() {
  const { sectionLocators } = useSectionsOfCurrentSong();

  useEffect(() => {
    const handleSectionsChanged = async () => {
      const firstSectionLocator = sectionLocators[0];
      if (!firstSectionLocator) {
        console.warn('no sections found for current song!');
        await setLoopStartToTime(0);
        await setLoopEndToTime(await ableton.song.get('song_length'));
      } else {
        setLoopStartToLocator(firstSectionLocator);
        const lastSectionLocator = sectionLocators[sectionLocators.length - 1];
        if (!lastSectionLocator || lastSectionLocator === firstSectionLocator) {
          console.warn(
            'only one section found for current song! using song length as loop end'
          );
          await setLoopEndToTime(await ableton.song.get('song_length'));
        } else {
          await setLoopEndToLocator(lastSectionLocator);
        }
      }
    };
    handleSectionsChanged();
  }, [sectionLocators]);

  return;
}

async function setLoopStartToLocator(locator: Locator) {
  console.log(`setting loop start to '${locator.name}'`);
  setLoopStartToTime(locator.time);
}

async function setLoopStartToTime(time: number) {
  const currentLoopStartTime = await ableton.song.get('loop_start');
  const currentLoopEndTime =
    (await ableton.song.get('loop_length')) + currentLoopStartTime;
  const newLoopStartTime = time;
  console.log(
    `setting loop start to ${newLoopStartTime}; loop end: ${currentLoopEndTime}`
  );

  const loopLength = currentLoopEndTime - newLoopStartTime;
  console.log(`setting loop length to ${loopLength}`);
  await ableton.song.set('loop_start', 0); // temporarily set loop start to 0 so that we can set loop length to any value up to the song length without producing an error
  await ableton.song.set('loop_length', loopLength);
  await ableton.song.set('loop_start', newLoopStartTime);
}

async function setLoopEndToLocator(locator: Locator) {
  console.log(`setting loop end to ${locator.name}'`);
  await setLoopEndToTime(locator.time);
}

async function setLoopEndToTime(time: number) {
  const loopStart = await ableton.song.get('loop_start');
  const loopEnd = time;
  console.log(`setting loop end to ${loopEnd}; loop start: ${loopStart}`);

  const newLoopLength = loopEnd - loopStart;
  console.log(`setting loop length to ${newLoopLength}`);
  await ableton.song.set('loop_length', newLoopLength);
}

async function init() {
  let clientStarted = false;
  while (!clientStarted) {
    try {
      await ableton.start();
      clientStarted = true;
    } catch (e) {
      console.log('error initializing', e);
      console.log('retrying in 1 second');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  const isPlaying = await ableton.song.get('is_playing');
  playing$.next(isPlaying);
  const {
    currentSong$: currentSongChange$,
    currentSongLocator$: currentSongLocatorChange$,
    nextSongLocator$: nextSongLocatorChange$,
    previousSongLocator$: previousSongLocatorChange$,
    sectionLocators$: sectionLocatorsChange$,
    currentSectionLocator$: currentSectionLocatorChange$,
  } = await createSongAndSection$(ableton);
  currentSongChange$.subscribe(console.log);
  currentSongLocatorChange$.subscribe(c => {
    if (c) currentSongLocator$.next(c);
  });
  nextSongLocatorChange$.subscribe(c => {
    if (c) nextSongLocator$.next(c);
  });
  previousSongLocatorChange$.subscribe(c => {
    if (c) previousSongLocator$.next(c);
  });
  currentSongChange$.subscribe(newSong => currentSong$.next(newSong || ''));

  ableton.song.addListener('is_playing', isPlaying => {
    playing$.next(isPlaying);
  });

  // TODO: move this to UI
  const songNameSoundGroupOverride: Record<string, string> = {
    'Slow Dancing (Live)': 'Slow Dancing',
    'Slow Dancing (Studio)': 'Slow Dancing',
  };

  const tracksAndTrackGroups$ = await createTracksAndTrackGroups$(ableton);

  const soundsForCurrentSong$ = combineLatest([
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

      return tracksForCurrentSong as MIDIOrAudioTrack[];
    })
  );

  soundsForCurrentSong$.subscribe(tracks => {
    currentSongSounds$.next(tracks);
  });

  const playbackTracksForCurrentSong$ = combineLatest([
    tracksAndTrackGroups$,
    currentSong$,
  ]).pipe(
    mergeMap(async ([tracks, currentSong]) => {
      const playbackTrackGroupGroupsGroupName = 'Playback Tracks'; // TODO: make this configurable
      const playbackTrackGroupsGroup = tracks.find(
        t => t.name === playbackTrackGroupGroupsGroupName && t.type === 'group'
      );

      if (
        !playbackTrackGroupsGroup ||
        playbackTrackGroupsGroup.type !== 'group'
      ) {
        // latter check is just to make typescript happy
        console.warn(
          `Playback Track group '${playbackTrackGroupGroupsGroupName}' not found`
        );
        return [];
      }

      const playbackTrackGroupForCurrentSong =
        playbackTrackGroupsGroup.children.find(
          t => t.name === currentSong && t.type === 'group'
        ) as GroupTrack | undefined;

      if (
        !playbackTrackGroupForCurrentSong ||
        playbackTrackGroupForCurrentSong.type !== 'group'
      ) {
        // latter check is just to make typescript happy
        console.warn(`No playback tracks could be found for '${currentSong}'.`);
        return [];
      }

      const tracksForCurrentSong = playbackTrackGroupForCurrentSong.children; // don't filter for only midiOrAudio tracks, because tracks can also be grouped here (i.e. drums with multiple tracks)

      return tracksForCurrentSong;
    })
  );

  playbackTracksForCurrentSong$.subscribe(tracks => {
    currentSongPlaybackTracks$.next(tracks);
  });

  sectionLocatorsChange$.subscribe(locators => {
    sectionLocators$.next(locators);
  });
  currentSectionLocatorChange$.subscribe(locator => {
    currentSectionLocator$.next(locator);
  });

  const isLooping = await ableton.song.get('loop');
  ableton.song.addListener('loop', isLooping => {
    looping$.next(isLooping);
  });
}

init();
