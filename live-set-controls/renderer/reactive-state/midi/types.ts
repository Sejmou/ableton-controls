export type MIDIMessage = {
  data: number[];
};

export type NoteMessage = {
  type: 'note on' | 'note off';
  note: number;
  velocity: number;
  channel: number;
};

export type ControlChangeMessage = {
  type: 'control change';
  value: number;
  control: number;
  channel: number;
};

export type TransportClockMessage = {
  type: number;
};

export type MIDINote = {
  note: number;
  velocity: number;
  channel: number;
  on: boolean;
};

export type MIDIControl = {
  control: number;
  value: number | undefined;
  channel: number;
};
