import { Input, MidiMessage } from 'midi';
import { ControlChangeMessage, NoteMessage } from './types';
import { Observable, Subject, filter, map } from 'rxjs';

export async function createMidiInputStream$(portName: string) {
  const input = new Input();
  const ports = getPorts(input);
  if (ports.length == 0) {
    throw new Error('No MIDI input ports found');
  }

  const targetPortIdx = ports.findIndex(port =>
    port.toLowerCase().includes(portName.toLowerCase())
  );
  if (targetPortIdx == -1) {
    throw new Error(`No port for port name '${portName}' found`);
  }
  console.log(
    `opened MIDI input port '${ports[targetPortIdx]}', listening for MIDI messages`
  );
  input.openPort(targetPortIdx);
  const midiMessageData$ = new Subject<MIDIMessageData>();
  input.on('message', (deltaTime, message) => {
    midiMessageData$.next(extractData(message));
  });

  const noteOn$: Observable<NoteMessage> = midiMessageData$.pipe(
    filter(({ actionName }) => actionName == 'note on'),
    map(({ data, channel }) => ({
      note: data[1],
      velocity: data[2],
      channel,
    }))
  );

  const noteOff$: Observable<NoteMessage> = midiMessageData$.pipe(
    filter(({ actionName }) => actionName == 'note off'),
    map(({ data, channel }) => ({
      note: data[1],
      velocity: data[2],
      channel,
    }))
  );

  const controlChange$: Observable<ControlChangeMessage> =
    midiMessageData$.pipe(
      filter(({ actionName }) => actionName == 'control change'),
      map(({ data, channel }) => ({
        control: data[1],
        value: data[2],
        channel,
      }))
    );

  return {
    midiMessageData$,
    noteOn$,
    noteOff$,
    controlChange$,
  };
}

function getPorts(input: Input) {
  const portCount = input.getPortCount();
  return [...Array(portCount).keys()].map(i => input.getPortName(i));
}

type MIDIMessageData = {
  actionName: ActionNames;
  leastSig: number;
  channel: number;
  data: number[];
};

function extractData(message: MidiMessage): MIDIMessageData {
  const action = message[0] & 0xf0; // Mask channel/least significant bits;
  const actionName = getActionName(action);

  const leastSig = message[0] & 0x0f; // Mask action bits;
  const channel = leastSig + 1;
  return {
    actionName,
    leastSig,
    channel,
    data: [...message],
  };
}

function getActionName(action: number) {
  switch (action) {
    case 0xb0:
      return 'control change';
    case 0x90:
      return 'note on';
    case 0x80:
      return 'note off';
    case 0xf0:
      return 'transport/clock';
    default:
      return 'unknown';
  }
}

type ActionNames = ReturnType<typeof getActionName>;
