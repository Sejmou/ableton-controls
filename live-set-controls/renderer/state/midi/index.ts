import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import {
  ParsedMIDIMessage,
  MIDIMessageFilters,
  isControlChangeFilters,
  isControlChangeMessage,
  isNoteFilters,
  isNoteMessage,
  NoteMessage,
  ControlChangeMessage,
} from './types';
import { useEffect, useMemo, useState } from 'react';
import { useObservableState, useSubscription } from 'observable-hooks';
import { MIDIMappings, useSettingsStore } from '~/state/settings-store';
import {
  useJumpToNextSong,
  useJumpToPreviousSong,
  usePlayback,
  useSwitchToNextSound,
  useSwitchToPreviousSound,
} from '../live-set';
type MIDIInput = WebMidi.MIDIInput;

const midiInputsSubject = new BehaviorSubject<MIDIInput[]>([]);

if (typeof window !== 'undefined') {
  window.navigator.requestMIDIAccess().then(midiAccess => {
    midiInputsSubject.next([...midiAccess.inputs.values()]);
    const listener = () => {
      console.log('statechange');
      midiInputsSubject.next([...midiAccess.inputs.values()]);
    };
    midiAccess.addEventListener('statechange', listener);
  });
}

export function useMidiInputs() {
  const inputs = useObservableState(midiInputsSubject);
  return inputs;
}

export function useMidiMappings() {
  const switchToNextSound = useSwitchToNextSound();
  const switchToPreviousSound = useSwitchToPreviousSound();
  const jumpToNextSong = useJumpToNextSong();
  const jumpToPreviousSong = useJumpToPreviousSong();
  const { start, stop, record } = usePlayback();

  useMIDIMapping('nextSound', switchToNextSound);
  useMIDIMapping('prevSound', switchToPreviousSound);
  useMIDIMapping('nextTrack', jumpToNextSong);
  useMIDIMapping('prevTrack', jumpToPreviousSong);
  useMIDIMapping('start', start);
  useMIDIMapping('stop', stop);
  useMIDIMapping('record', record);
}

export function useMIDIMapping(
  action: keyof MIDIMappings,
  callback: () => void
) {
  const midiInput = useCurrentMidiInput();
  const mapping = useSettingsStore(state => state.midiMappings[action]);
  const actionCallback: (message: ParsedMIDIMessage) => void = useMemo(() => {
    if (!mapping) {
      console.log('no MIDI mapping for', action);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    return message => {
      if (matchesFilters(message, mapping)) {
        callback();
      }
    };
  }, [callback, mapping]);

  useMIDIMessageCallback(actionCallback, midiInput);
}

// TODO: find out where to place this, maybe reorganize files someday
export function useCurrentMidiInput() {
  const inputId = useSettingsStore(state => state.midiInputId);
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

// keep track of the observables for each input so that we don't create a new one every time
// key is the input id
const midiInputMidiMessageObservables = new Map<
  string,
  Observable<ParsedMIDIMessage>
>();

function useMidiInputMessageObservable(input?: MIDIInput) {
  const obs = useMemo(() => {
    if (!input) {
      return of();
    }
    const id = input.id;
    if (!midiInputMidiMessageObservables.has(id)) {
      const obs = createMIDIMessageObservable(input);
      midiInputMidiMessageObservables.set(id, obs);
    }
    return midiInputMidiMessageObservables.get(id)!;
  }, [input]);

  return obs;
}

/**
 * Creates an Observable for MIDI messages from the given input. Under the hood, this uses a Subject, so that only one event listener for the input is created.
 * This Observable will keep emitting values through the lifetime of this application, the event listener used under the hood is never deleted.
 * This 'memory leak' should not be a problem for this application, since only one Subject is ever created per input and the number of MIDI inputs is expected to be small.
 *
 * @param input the MIDI input to create an Observable for
 * @returns an Observable for MIDI messages from the given input
 */
function createMIDIMessageObservable(input: MIDIInput) {
  console.log(
    `creating MIDI message observable for input '${input.name}' with ID ${input.id}`
  );
  const subject = new Subject<ParsedMIDIMessage>();
  const listener = function (this: MIDIInput, event: Event) {
    const midiMessageEvent = event as MIDIMessageEvent; // not sure why this is necessary
    const data = extractData(midiMessageEvent);
    subject.next(data);
  };
  input.addEventListener('midimessage', listener);
  return subject.asObservable();
}

export function useMIDIMessageCallback(
  callback: (message: ParsedMIDIMessage) => void,
  input?: MIDIInput
) {
  const messageObs = useMidiInputMessageObservable(input);

  useSubscription(messageObs, callback);

  return;
}

export function matchesFilters(
  message: ParsedMIDIMessage,
  filters: MIDIMessageFilters
) {
  if (isNoteMessage(message)) {
    if (!isNoteFilters(filters)) return false;
  }
  if (isControlChangeMessage(message)) {
    if (!isControlChangeFilters(filters)) return false;
  }
  for (const key in filters) {
    const filterKey = key as keyof typeof filters; // TS apparently needs help with this
    if (message[filterKey] !== filters[filterKey]) return false;
  }
  return true;
}

export function extractData(message: MIDIMessageEvent): ParsedMIDIMessage {
  const data = message.data;

  const messageTypeNumber = data[0]! & 0xf0; // Mask channel/least significant bits;
  const type = getMessageType(messageTypeNumber);

  const leastSig = data[0]! & 0x0f; // Mask action bits;
  const channel = leastSig + 1;

  if (type === 'note on' || type === 'note off') {
    const note = data[1]!;
    const velocity = data[2]!;
    const noteMessage: NoteMessage = {
      type,
      channel,
      note,
      velocity,
    };
    return noteMessage;
  }

  if (type === 'control change') {
    const control = data[1]!;
    const value = data[2]!;
    const controlChangeMessage: ControlChangeMessage = {
      type,
      channel,
      control,
      value,
    };
    return controlChangeMessage;
  }

  // TODO: handle other message types

  return {
    type,
    channel,
  };
}

function getMessageType(action: number) {
  switch (action) {
    case 0xb0:
      return 'control change';
    case 0x90:
      return 'note on';
    case 0x80:
      return 'note off';
    case 0xf0:
      return 'transport/clock';
    default:
      return 'unknown';
  }
}
