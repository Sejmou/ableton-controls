import { Ableton } from 'ableton-js';
import { MIDIInput } from './midi';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const tracks = await ableton.song.get('tracks');
  await tracks[1].set('arm', true);

  let currentArmIndex = tracks.findIndex(track => track.get('arm'));

  const input = new MIDIInput();
  input.addNoteOnListener(
    () => {
      async function armNext() {
        const tracks = await ableton.song.get('tracks');
        if (tracks.length == 0) {
          return;
        }
        if (currentArmIndex == tracks.length - 1) {
          return;
        }
        await tracks[currentArmIndex].set('arm', false);
        await tracks[currentArmIndex + 1].set('arm', true);
        currentArmIndex++;
      }
      armNext();
    },
    {
      note: 1,
      channel: 1,
    }
  );

  input.addNoteOnListener(
    () => {
      async function armPrevious() {
        const tracks = await ableton.song.get('tracks');
        if (tracks.length == 0) {
          return;
        }
        if (currentArmIndex == 0) {
          return;
        }
        await tracks[currentArmIndex].set('arm', false);
        await tracks[currentArmIndex - 1].set('arm', true);
        currentArmIndex--;
      }
      armPrevious();
    },
    {
      note: 0,
      channel: 1,
    }
  );
};

main();
