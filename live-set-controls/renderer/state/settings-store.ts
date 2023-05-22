import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MIDINoteFilters } from './midi';

export type MIDIMappings = {
  nextTrack?: MIDINoteFilters;
  prevTrack?: MIDINoteFilters;
  nextSound?: MIDINoteFilters;
  prevSound?: MIDINoteFilters;
  play?: MIDINoteFilters;
  stop?: MIDINoteFilters;
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
    name: keyof MIDIMappings,
    filters: MIDINoteFilters
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
