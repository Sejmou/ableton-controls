import { Ableton } from 'ableton-js';
import { createSongAndSection$ } from './songs-and-sections';
import { BehaviorSubject } from 'rxjs';

const ableton = new Ableton({ logger: console }); // Log all messages to the console
export const currentSong$ = new BehaviorSubject('');

async function init() {
  await ableton.start();
  const { currentSong$: currentSongChange$ } = await createSongAndSection$(
    ableton
  );
  currentSongChange$.subscribe(newSong => currentSong$.next(newSong));
}

init();
