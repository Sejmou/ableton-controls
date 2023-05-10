import { Input, MidiMessage } from 'midi';
import {
  ControlChangeMessage,
  NoteMessage,
  TransportClockMessage,
} from './types';

type MIDIMessageListeners = {
  noteOn: { [id: string]: (message: NoteMessage) => void };
  noteOff: { [id: string]: (message: NoteMessage) => void };
  controlChange: { [id: string]: (message: ControlChangeMessage) => void };
};

export class MIDIInput {
  private input: Input;

  constructor() {
    this.input = new Input();
    const portCount = this.input.getPortCount();
    if (portCount == 0) {
      throw new Error('No MIDI input ports found');
    }
    this.input.on('message', (deltaTime, message) => {
      this.handleMIDIMessage(message);
    }); // important to bind this, otherwise this will be undefined when calling handleMIDIMessage
    this.input.openPort(0);
  }

  // TODO: it is not particularly clean to allow changing this from outside the class
  private listeners: MIDIMessageListeners = {
    noteOn: {},
    noteOff: {},
    controlChange: {},
  };

  public addListener(
    type: 'noteOn' | 'noteOff' | 'controlChange',
    callback: (message: NoteMessage | ControlChangeMessage) => void
  ) {
    const id = Math.random().toString();
    this.listeners[type][id] = callback;
    return id;
  }

  public removeListener(
    type: 'noteOn' | 'noteOff' | 'controlChange',
    id: string
  ) {
    delete this.listeners[type][id];
  }

  private handleNoteOn(message: NoteMessage) {
    for (const key in this.listeners.noteOn) {
      this.listeners.noteOn[key](message);
    }
  }

  private handleNoteOff(message: NoteMessage) {
    for (const key in this.listeners.noteOff) {
      this.listeners.noteOff[key](message);
    }
  }

  private handleControlChange(message: ControlChangeMessage) {
    for (const key in this.listeners.controlChange) {
      this.listeners.controlChange[key](message);
    }
  }

  private handleTransportClockMessage(message: TransportClockMessage) {
    console.warn(
      'transport/clock message handling not implemented yet; message:',
      message
    );
  }

  private handleMIDIMessage(message: MidiMessage) {
    const { actionName, channel, data } = extractData(message);

    if (actionName == 'control change') {
      const message: ControlChangeMessage = {
        control: data[1],
        value: data[2],
        channel,
      };
      this.handleControlChange(message);
    } else if (actionName == 'transport/clock') {
      const message: TransportClockMessage = {
        type: data[0],
      };
      this.handleTransportClockMessage(message);
    } else if (actionName == 'unknown') {
      console.log(
        'cannot handle MIDI message, unknown action type, orignal MIDIMessageEvent:',
        message
      );
    } else {
      const message: NoteMessage = {
        note: data[1],
        velocity: data[2],
        channel,
      };
      if (actionName == 'note on') {
        this.handleNoteOn(message);
      } else if (actionName == 'note off') {
        this.handleNoteOff(message);
      }
    }
  }
}

function extractData(message: MidiMessage): {
  actionName: ActionNames;
  leastSig: number;
  channel: number;
  data: number[];
} {
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
