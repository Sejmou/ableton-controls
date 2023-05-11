import { Ableton } from 'ableton-js';
import { TrackManager } from './track-manager';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  new TrackManager(ableton);
};

main();
