import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MIDIMessageFilters } from './midi/types';

export type MIDIMappings = {
  nextTrack?: MIDIMessageFilters; // TODO: rename to nextSong
  prevTrack?: MIDIMessageFilters; // TODO: rename to prevSong
  nextSound?: MIDIMessageFilters;
  prevSound?: MIDIMessageFilters;
  play?: MIDIMessageFilters;
  stop?: MIDIMessageFilters;
};

export const midiMappableActions: Array<keyof MIDIMappings> = [
  'nextTrack',
  'prevTrack',
  'nextSound',
  'prevSound',
  'play',
  'stop',
];

type SettingsStore = {
  midiInputId?: string;
  setMidiInputId: (name?: string) => void;
  midiMappings: MIDIMappings;
  updateMidiMapping: (
    actionName: keyof MIDIMappings,
    mapping?: MIDIMessageFilters
  ) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        setMidiInputId: midiInputId =>
          set(() => {
            console.log('new ID', midiInputId);
            return {
              midiInputId,
            };
          }),
        midiMappings: {},
        updateMidiMapping: (name, filters) =>
          set(state => {
            const midiMappings = { ...state.midiMappings };
            midiMappings[name] = filters;
            return {
              midiMappings,
            };
          }),
      }),

      {
        name: 'app-storage', // name of the item in the storage (must be unique)
      }
    )
  )
);
