import { Ableton } from 'ableton-js';
import { createSongAndSection$ } from './songs-and-sections';
import { BehaviorSubject, combineLatest, mergeMap } from 'rxjs';
import { MIDIOrAudioTrack, createTracksAndTrackGroups$ } from './tracks';
import { useObservableState } from 'observable-hooks';

const ableton = new Ableton({ logger: console }); // Log all messages to the console
export const currentSong$ = new BehaviorSubject('');
export const currentSongTracks$ = new BehaviorSubject<MIDIOrAudioTrack[]>([]);

export function useCurrentSong() {
  const currentSong = useObservableState(currentSong$);
  return currentSong;
}

export function useTracksForCurrentSong() {
  const tracks = useObservableState(currentSongTracks$);
  return tracks;
}

async function init() {
  await ableton.start();
  const { currentSong$: currentSongChange$ } = await createSongAndSection$(
    ableton
  );
  currentSongChange$.subscribe(console.log);
  currentSongChange$.subscribe(newSong => currentSong$.next(newSong || ''));

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
    currentSongTracks$.next(tracks);
  });
}

init();
