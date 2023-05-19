import { type Input, useMIDI, useMIDINote } from "@react-midi/hooks";
import { Label, Select } from "flowbite-react";
import { useSongStore } from "~/store";

type Props = {
  className?: string;
};

const MIDIInputSelect = ({ className }: Props) => {
  const { inputs } = useMIDI(); // Initially returns [[], []]
  console.log("available MIDI inputs", inputs);
  const midiInput = useSongStore((state) => state.midiInput);
  const setMidiInput = useSongStore((state) => state.setMidiInput);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedInput = inputs?.find((i) => i.id === e.target.value);
    if (selectedInput) {
      setMidiInput(selectedInput);
    }
  };

  if (!inputs) {
    return (
      <div>
        No MIDI inputs available. Connect one to scroll through the page with it
        (send MIDI note 2 on any channel for scrolling up and MIDI note 3 for
        scrolling down).
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="w-full" id="select">
        <div className="mb-2 block">
          <Label
            htmlFor="midi-inputs"
            value="Select a MIDI input (to scroll via MIDI - note 2 on any channel for scroll up, note 3 for scroll down)"
          />
        </div>
        <Select id="midi-inputs" required={false} onChange={handleSelectChange}>
          {inputs.map((input) => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </Select>
      </div>
      {midiInput && <MIDINoteLog input={midiInput} />}
    </div>
  );
};

const MIDINoteLog = ({ input }: { input: Input }) => {
  const event = useMIDINote(input); // Intially returns undefined
  if (!event) {
    return <div>Waiting for note...</div>;
  }
  const { on, note, velocity, channel } = event;
  return (
    <div>
      Note {note} {on ? "on" : "off"} ({velocity}) on channel {channel}
    </div>
  );
};

export default MIDIInputSelect;
