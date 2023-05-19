import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type Store = {
  midiInputName?: string;
  setMidiInputName: (name?: string) => void;
};

export const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        setMidiInputName: input =>
          set(() => ({
            midiInputName: input,
          })),
      }),

      {
        name: 'app-storage', // name of the item in the storage (must be unique)
      }
    )
  )
);
