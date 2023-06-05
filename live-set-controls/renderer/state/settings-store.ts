import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MIDIMessageFilters } from './midi/types';

export type MIDIMappings = {
  nextTrack?: MIDIMessageFilters; // TODO: rename to nextSong
  prevTrack?: MIDIMessageFilters; // TODO: rename to prevSong
  nextSound?: MIDIMessageFilters;
  prevSound?: MIDIMessageFilters;
  start?: MIDIMessageFilters;
  stop?: MIDIMessageFilters;
  record?: MIDIMessageFilters;
};

export const midiMappableActions: Array<keyof MIDIMappings> = [
  'nextTrack',
  'prevTrack',
  'nextSound',
  'prevSound',
  'start',
  'stop',
  'record',
];

type SettingsStore = {
  midiInputId?: string;
  setMidiInputId: (name?: string) => void;
  midiMappings: MIDIMappings;
  updateMidiMapping: (
    actionName: keyof MIDIMappings,
    mapping?: MIDIMessageFilters
  ) => void;
  songSoundsMonitorMode?: 'auto' | 'in'; // defines the monitor mode of the sounds for the current song that is played in the Live set
  setSongSoundsMonitorMode: (mode: 'auto' | 'in' | undefined) => void;
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
        setSongSoundsMonitorMode: mode =>
          set(() => ({
            songSoundsMonitorMode: mode,
          })),
      }),

      {
        name: 'app-storage', // name of the item in the storage (must be unique)
      }
    )
  )
);
