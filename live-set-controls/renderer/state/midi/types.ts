export type MIDIMessageTypes =
  | 'note on'
  | 'note off'
  | 'control change'
  | 'transport/clock'
  | 'unknown';

// MIDI message where data was already extracted from the raw data array
export interface ParsedMIDIMessage {
  type: MIDIMessageTypes;
  channel: number;
}

export interface NoteMessage extends ParsedMIDIMessage {
  type: 'note on' | 'note off';
  note: number;
  velocity: number;
}

export interface ControlChangeMessage extends ParsedMIDIMessage {
  type: 'control change';
  value: number;
  control: number;
}

export function isControlChangeMessage(
  message: ParsedMIDIMessage
): message is ControlChangeMessage {
  return message.type === 'control change';
}

export function isNoteMessage(
  message: ParsedMIDIMessage
): message is NoteMessage {
  return message.type === 'note on' || message.type === 'note off';
}

export interface MIDIMessageFilters {
  type: MIDIMessageTypes;
  channel?: number;
}

export interface MIDINoteFilters extends MIDIMessageFilters {
  type: 'note on' | 'note off';
  note?: number;
}

export interface MIDIControlChangeFilters extends MIDIMessageFilters {
  control?: number;
  value?: number;
  type: 'control change';
}

export function isNoteFilters(
  filters: MIDIMessageFilters
): filters is MIDINoteFilters {
  return filters.type === 'note on' || filters.type === 'note off';
}

export function isControlChangeFilters(
  filters: MIDIMessageFilters
): filters is MIDIControlChangeFilters {
  return filters.type === 'control change';
}
