import { Label, Select } from 'flowbite-react';
import { useObservableState } from 'observable-hooks';
import { useEffect, useMemo } from 'react';
import { bufferCount, from, map, merge, of, scan } from 'rxjs';
import { useMidiInputMessageStreams, midiInputs$ } from '~/reactive-state/midi';
import { ControlChangeMessage, NoteMessage } from '~/reactive-state/midi/types';
import { useStore } from '~/store';

type Props = {
  className?: string;
};

const MIDIInputSelect = ({ className }: Props) => {
  const inputs = useObservableState(midiInputs$);
  console.log('available MIDI inputs', inputs);
  const midiInput = useStore(state => state.midiInput);
  const setMidiInput = useStore(state => state.setMidiInput);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('selected MIDI input', e.target.value);
    const selectedInput = inputs?.find(i => i.name === e.target.value);
    if (selectedInput) {
      setMidiInput(selectedInput);
    }
  };

  if (!inputs) {
    return <div>No MIDI inputs available.</div>;
  }

  console.log('selected MIDI input', midiInput);

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
          value={midiInput?.name || '(None)'}
        >
          {inputs.map(input => (
            <option
              className="border-0"
              key={input.id}
              value={input.name || '(Unknown)'}
            >
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
  const midiMessageStreams = useMidiInputMessageStreams(input);
  // const recentMessages$ = useMemo( // no idea why this doesn't work :(
  //   () =>
  //     midiMessageStreams
  //       ? merge(
  //           midiMessageStreams.noteOn$,
  //           midiMessageStreams.noteOff$,
  //           midiMessageStreams.controlChange$
  //         ).pipe(
  //           scan((acc, val) => {
  //             console.log('acc', acc, 'val', val);
  //             acc.push(val);
  //             return acc.slice(-3);
  //           }, [] as Array<NoteMessage | ControlChangeMessage>)
  //         )
  //       : of(),
  //   [midiMessageStreams]
  // );
  // const recentMessages = useObservableState(recentMessages$);
  const lastMessage$ = useMemo(
    () =>
      midiMessageStreams
        ? merge(
            midiMessageStreams.noteOn$,
            midiMessageStreams.noteOff$,
            midiMessageStreams.controlChange$
          )
        : of(),
    [midiMessageStreams]
  );
  const lastMessage = useObservableState(lastMessage$);

  if (!midiMessageStreams) {
    return (
      <div>Could not setup MIDI message streams for input '{input.name}'</div>
    );
  }

  if (!lastMessage) {
    return (
      <div>
        Send some MIDI Note or Control Change Messages. They will show up here.
      </div>
    );
  }

  const { type, ...rest } = lastMessage;

  return (
    <div className="flex flex-col">
      <h3>Last MIDI message:</h3>

      <div>
        <div>Event type: {type}</div>
        <div>Data: {JSON.stringify(rest)}</div>
      </div>
      {/* <h3>Recent MIDI messages:</h3>
      {recentMessages.map((m, i) => {
        if (!m) return <div>no message</div>;
        const { type, ...rest } = m;
        return (
          <div key={i}>
            <div>Event type: {type}</div>
            <div>Data: {JSON.stringify(rest)}</div>
          </div>
        );
      })} */}
    </div>
  );
};

export default MIDIInputSelect;
