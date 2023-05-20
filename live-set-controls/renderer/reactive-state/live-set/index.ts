import { Ableton } from 'ableton-js';
import { createSongAndSection$ } from './songs-and-sections';
import { BehaviorSubject } from 'rxjs';
import {
  GroupTrack,
  MIDIOrAudioTrack,
  createTracksAndTrackGroups$,
} from './tracks';

const ableton = new Ableton({ logger: console }); // Log all messages to the console
export const currentSong$ = new BehaviorSubject('');
export const tracks$ = new BehaviorSubject<(MIDIOrAudioTrack | GroupTrack)[]>(
  []
);

async function init() {
  await ableton.start();
  const { currentSong$: currentSongChange$ } = await createSongAndSection$(
    ableton
  );
  currentSongChange$.subscribe(newSong => currentSong$.next(newSong || ''));

  const tracksChange$ = await createTracksAndTrackGroups$(ableton);
  tracksChange$.subscribe(newTracks => tracks$.next(newTracks));
}

init();
