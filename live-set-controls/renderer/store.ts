import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type Store = {
  midiInputId?: string;
  setMidiInputId: (name?: string) => void;
};

export const useStore = create<Store>()(
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
      }),

      {
        name: 'app-storage', // name of the item in the storage (must be unique)
      }
    )
  )
);
