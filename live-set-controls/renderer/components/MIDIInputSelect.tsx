import { Label, Select } from 'flowbite-react';
import { useObservableState } from 'observable-hooks';
import { useEffect, useMemo } from 'react';
import { bufferCount, from, map, merge, of, scan } from 'rxjs';
import {
  useMIDINoteOnStream,
  useMIDINoteOffStream,
  useMIDIControlChangeStream,
  midiInputs$,
} from '~/reactive-state/midi';
import { ControlChangeMessage, NoteMessage } from '~/reactive-state/midi/types';
import { useStore } from '~/store';

type Props = {
  className?: string;
};

const MIDIInputSelect = ({ className }: Props) => {
  const inputs = useObservableState(midiInputs$);
  console.log('available MIDI inputs', inputs);
  const midiInputId = useStore(state => state.midiInputId);
  const setMidiInputId = useStore(state => state.setMidiInputId);
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
          value={midiInputId || '(None)'}
        >
          {inputs.map(input => (
            <option className="border-0" key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
          <option className="border-0" value={undefined}>
            -
          </option>
        </Select>
      </div>
      {midiInput && <MIDINoteLog input={midiInput} />}
    </div>
  );
};

const MIDINoteLog = ({ input }: { input: MIDIInput }) => {
  const noteOn$ = useMIDINoteOnStream(input);
  const noteOff$ = useMIDINoteOffStream(input);
  const controlChange$ = useMIDIControlChangeStream(input);

  const recentMessages$ = useMemo(
    () =>
      merge(noteOn$, noteOff$, controlChange$).pipe(
        scan((acc, val) => {
          acc.push(val);
          return acc.slice(-3);
        }, [] as Array<NoteMessage | ControlChangeMessage>)
      ),
    [noteOn$, noteOff$, controlChange$]
  );
  const recentMessages = useObservableState(recentMessages$);

  return (
    <div className="flex flex-col">
      <h3>Recent MIDI messages:</h3>
      {recentMessages?.map((m, i) => {
        if (!m) return <div>no message</div>;
        const { type, ...rest } = m;
        return (
          <div key={i}>
            <div>Event type: {type}</div>
            <div>Data: {JSON.stringify(rest)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default MIDIInputSelect;
