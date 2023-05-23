import { Label, Select } from 'flowbite-react';
import { useMemo, useState } from 'react';
import { useMIDIMessageCallback, useMidiInputs } from '~/state/midi';
import { ParsedMIDIMessage } from '~/state/midi/types';
import { useSettingsStore } from '~/state/settings-store';

type Props = {
  className?: string;
};

const MIDIInputSelect = ({ className }: Props) => {
  const inputs = useMidiInputs();
  console.log('available MIDI inputs', inputs);
  const midiInputId = useSettingsStore(state => state.midiInputId);
  const setMidiInputId = useSettingsStore(state => state.setMidiInputId);
  const midiInput = useMemo(
    () => inputs?.find(i => i.id === midiInputId),
    [inputs, midiInputId]
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedInputId = inputs?.find(i => i.id === e.target.value)?.id;
    console.log('selectedInputId', selectedInputId);
    setMidiInputId(selectedInputId);
  };

  if (!inputs) {
    return <div>No MIDI inputs available.</div>;
  }

  return (
    <div className={className}>
      <div className="w-full" id="select">
        <div className="mb-2 block">
          <Label
            htmlFor="midi-inputs"
            value="Select a MIDI input to control the live set."
          />
        </div>
        <Select
          id="midi-inputs"
          className="border rounded p-2"
          required={false}
          onChange={handleSelectChange}
          value={midiInputId || ''}
        >
          <option disabled={!midiInputId} className="border-0" value="">
            {!midiInputId ? 'Select an Input' : '(None)'}
          </option>
          {inputs.map(input => (
            <option className="border-0" key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </Select>
      </div>
      {midiInput && <MIDINoteLog input={midiInput} />}
    </div>
  );
};

const MIDINoteLog = ({ input }: { input: MIDIInput }) => {
  const [lastMessage, setLastMessage] = useState<ParsedMIDIMessage>();

  const onMIDIMessage = (message: ParsedMIDIMessage) => {
    console.log('message', message);
    setLastMessage(message);
  };

  useMIDIMessageCallback(onMIDIMessage, input);

  return (
    <div className="flex flex-col">
      <h3>Last MIDI message:</h3>
      {!lastMessage && (
        <p>Once a MIDI message was received it will be displayed here</p>
      )}
      {lastMessage && JSON.stringify(lastMessage)}
    </div>
  );
};

export default MIDIInputSelect;
