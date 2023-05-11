import { Input, MidiMessage } from 'midi';
import {
  ControlChangeMessage,
  NoteMessage,
  TransportClockMessage,
  MIDINoteFilter,
  MIDIControlFilter,
} from './types';

type MIDIMessageListeners = {
  noteOn: { [id: string]: (message: NoteMessage) => void };
  noteOff: { [id: string]: (message: NoteMessage) => void };
  controlChange: { [id: string]: (message: ControlChangeMessage) => void };
};

export class MIDIInputHandler {
  private input: Input;

  constructor(portName: string) {
    this.input = new Input();
    const ports = this.ports;
    if (ports.length == 0) {
      throw new Error('No MIDI input ports found');
    }
    console.log('available MIDI input ports:', ports);
    this.input.on('message', (deltaTime, message) => {
      this.handleMIDIMessage(message);
    }); // important to bind this, otherwise this will be undefined when calling handleMIDIMessage
    const targetPortIdx = ports.findIndex(port =>
      port.toLowerCase().includes(portName.toLowerCase())
    );
    if (targetPortIdx == -1) {
      throw new Error(`No port for port name '${portName}' not found`);
    }
    console.log(
      `opening and listening on MIDI input port '${ports[targetPortIdx]}'`
    );
    this.input.openPort(targetPortIdx);
  }

  private get ports() {
    const portCount = this.input.getPortCount();
    return [...Array(portCount).keys()].map(i => this.input.getPortName(i));
  }

  // TODO: it is not particularly clean to allow changing this from outside the class
  private listeners: MIDIMessageListeners = {
    noteOn: {},
    noteOff: {},
    controlChange: {},
  };

  public addNoteOnListener(
    callback: (message: NoteMessage) => void,
    filter?: MIDINoteFilter
  ) {
    const id = Math.random().toString();
    this.listeners.noteOn[id] = message => {
      if (filter) {
        if (filter.note !== undefined && filter.note != message.note) {
          return;
        }
        if (filter.channel !== undefined && filter.channel != message.channel) {
          return;
        }
      }
      callback(message);
    };
    return id;
  }

  public addNoteOffListener(
    callback: (message: NoteMessage) => void,
    filter?: MIDINoteFilter
  ) {
    const id = Math.random().toString();
    this.listeners.noteOff[id] = message => {
      if (filter) {
        if (filter.note !== undefined && filter.note != message.note) {
          return;
        }
        if (filter.channel !== undefined && filter.channel != message.channel) {
          return;
        }
      }
      callback(message);
    };
    return id;
  }

  public addControlChangeListener(
    callback: (message: ControlChangeMessage) => void,
    filter?: MIDIControlFilter
  ) {
    const id = Math.random().toString();
    this.listeners.controlChange[id] = message => {
      if (filter) {
        if (filter.control !== undefined && filter.control != message.control) {
          return;
        }
        if (filter.channel !== undefined && filter.channel != message.channel) {
          return;
        }
      }
      callback(message);
    };
    return id;
  }

  public removeListener(id: string) {
    if (this.listeners.noteOn[id]) {
      delete this.listeners.noteOn[id];
    } else if (this.listeners.noteOff[id]) {
      delete this.listeners.noteOff[id];
    } else if (this.listeners.controlChange[id]) {
      delete this.listeners.controlChange[id];
    } else {
      console.warn(
        `Could not remove MIDI input lister: No listener with id ${id} found`
      );
    }
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
