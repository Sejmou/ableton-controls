import { useEffect, useState } from 'react';
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

// TODO: find out where to place this, maybe reorganize files someday
export function useMidiInput() {
  const inputId = useStore(state => state.midiInputId);
  const [input, setInput] = useState<MIDIInput>();
  useEffect(() => {
    if (!inputId) {
      return undefined;
    }
    const getMidiInput = async () => {
      const midiAccess = await navigator.requestMIDIAccess();
      const input = midiAccess.inputs.get(inputId);
      setInput(input);
    };
    getMidiInput();
  }, [inputId]);

  return input;
}
