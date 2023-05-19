export type MIDINoteFilter = {
  note?: number;
  channel?: number;
};

export type MIDIControlFilter = {
  control?: number;
  channel?: number;
};

export type MIDIMessage = {
  data: number[];
};

export type NoteMessage = {
  note: number;
  velocity: number;
  channel: number;
};

export type ControlChangeMessage = {
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
