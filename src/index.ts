import { Ableton } from 'ableton-js';
import { MIDIInput } from './midi';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const tracks = await ableton.song.get('tracks');
  await tracks[1].set('arm', true);

  const input = new MIDIInput();
  input.addListener('noteOn', message => {
    console.log('Note on:', message);
  });
};

main();
