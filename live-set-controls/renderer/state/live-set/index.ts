import { Ableton } from 'ableton-js';
import { Locator, createSongAndSection$ } from './songs-and-sections';
import { BehaviorSubject, Subject, combineLatest, mergeMap } from 'rxjs';
import { MIDIOrAudioTrack, createTracksAndTrackGroups$ } from './tracks';
import { useObservableState } from 'observable-hooks';
import { useMemo } from 'react';

const ableton = new Ableton({ logger: console }); // Log all messages to the console
// TODO: do I even need to use Subjects here?
const currentSong$ = new BehaviorSubject('');
const currentSongLocator$ = new Subject<Locator>();
const nextSongLocator$ = new Subject<Locator>();
const previousSongLocator$ = new Subject<Locator>();
const currentSongSounds$ = new BehaviorSubject<MIDIOrAudioTrack[]>([]);
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

export function useCurrentSongLocator() {
  const currentSongLocator = useObservableState(currentSongLocator$);
  return currentSongLocator;
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

      return tracksForCurrentSong as MIDIOrAudioTrack[];
    })
  );

  tracksForCurrentSong$.subscribe(tracks => {
    currentSongSounds$.next(tracks);
  });
}

init();
