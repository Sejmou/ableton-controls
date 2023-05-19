import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type Store = {
  midiInput?: MIDIInput;
  setMidiInput: (input?: MIDIInput) => void;
};

export const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        setMidiInput: input =>
          set(() => ({
            midiInput: input,
          })),
      }),

      {
        name: 'app-storage', // name of the item in the storage (must be unique)
      }
    )
  )
);
