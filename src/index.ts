import { Ableton } from 'ableton-js';
// import { TrackManager } from './track-manager';
import { createSongAndSection$ } from './reactive-state/song-and-section';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const songAndSection$ = await createSongAndSection$(ableton);
  songAndSection$.subscribe(console.log);

  // new TrackManager(ableton, 'BT500S');
};

main();
