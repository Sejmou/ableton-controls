import { BehaviorSubject, Observable, Subject, filter, map, of } from 'rxjs';
import { ControlChangeMessage, NoteMessage } from './types';
import { useEffect, useMemo, useState } from 'react';
import { useObservableState, useSubscription } from 'observable-hooks';
import { useSettingsStore } from '~/state/settings-store';
import {
  useJumpToNextSong,
  useJumpToPreviousSong,
  useSwitchToNextSound,
  useSwitchToPreviousSound,
} from '../live-set';

const midiInputsSubject = new BehaviorSubject<MIDIInput[]>([]);

window.navigator.requestMIDIAccess().then(midiAccess => {
  midiInputsSubject.next([...midiAccess.inputs.values()]);
  const listener = () => {
    console.log('statechange');
    midiInputsSubject.next([...midiAccess.inputs.values()]);
  };
  midiAccess.addEventListener('statechange', listener);
});

export function useMidiInputs() {
  const inputs = useObservableState(midiInputsSubject);
  return inputs;
}

// dirty hack to make sure that only mappings that exist are applied by using this impossible filter if no mapping exists
const impossibleFilter: MIDINoteFilters = {
  channel: -1,
};

export function useMidiMappings() {
  const midiInput = useCurrentMidiInput();
  const mappings = useSettingsStore(state => state.midiMappings);

  const switchToNextSound = useSwitchToNextSound();
  const switchToPreviousSound = useSwitchToPreviousSound();
  const jumpToNextSong = useJumpToNextSong();
  const jumpToPreviousSong = useJumpToPreviousSong();

  useMIDINoteCallback(
    switchToNextSound,
    midiInput,
    mappings.nextSound || impossibleFilter
  );
  useMIDINoteCallback(
    switchToPreviousSound,
    midiInput,
    mappings.prevSound || impossibleFilter
  );
  useMIDINoteCallback(
    jumpToNextSong,
    midiInput,
    mappings.nextTrack || impossibleFilter
  );
  useMIDINoteCallback(
    jumpToPreviousSong,
    midiInput,
    mappings.prevTrack || impossibleFilter
  );
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
  Observable<MIDIMessageData>
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
  const subject = new Subject<MIDIMessageData>();
  const listener = function (this: MIDIInput, event: Event) {
    const midiMessageEvent = event as MIDIMessageEvent; // not sure why this is necessary
    const data = extractData(midiMessageEvent);
    subject.next(data);
  };
  input.addEventListener('midimessage', listener);
  return subject.asObservable();
}

export type MIDINoteFilters = {
  note?: number;
  channel?: number;
  type?: 'note on' | 'note off';
};

export function useMIDINoteCallback(
  callback: (message: NoteMessage) => void,
  input?: MIDIInput,
  filters?: MIDINoteFilters
) {
  const messageObs = useMidiInputMessageObservable(input);
  const obs = useMemo(
    () =>
      messageObs.pipe(
        filter(({ actionName }) =>
          filters?.type
            ? actionName == filters.type
            : actionName == 'note on' || actionName == 'note off'
        ),
        map(({ data, channel, actionName }) => ({
          note: data[1]!,
          velocity: data[2]!,
          channel,
          type: actionName as 'note on' | 'note off',
        })),
        filter(msg => {
          for (const key in filters) {
            const filterKey = key as keyof typeof filters; // TS apparently needs help with this
            if (
              filters[filterKey] !== undefined &&
              msg[filterKey] !== filters[filterKey]
            )
              return false;
          }
          return true;
        })
      ),
    [input, filters]
  );

  useSubscription(obs, callback);

  return;
}

export function useMIDINoteOnStream(input: MIDIInput): Observable<NoteMessage> {
  const messageObs = useMidiInputMessageObservable(input);
  const obs = useMemo(
    () =>
      messageObs.pipe(
        filter(({ actionName }) => actionName == 'note on'),
        map(({ data, channel }) => ({
          note: data[1]!,
          velocity: data[2]!,
          channel,
          type: 'note on' as const,
        }))
      ),
    [input]
  );

  return obs;
}

export function useMIDINoteOffStream(
  input: MIDIInput
): Observable<NoteMessage> {
  const messageObs = useMidiInputMessageObservable(input);
  const obs = useMemo(
    () =>
      messageObs.pipe(
        filter(({ actionName }) => actionName == 'note off'),
        map(({ data, channel }) => ({
          note: data[1]!,
          velocity: data[2]!,
          channel,
          type: 'note off' as const,
        }))
      ),
    [input]
  );

  return obs;
}

export function useMIDIControlChangeStream(
  input: MIDIInput
): Observable<ControlChangeMessage> {
  const messageObs = useMidiInputMessageObservable(input);
  const obs = useMemo(
    () =>
      messageObs.pipe(
        filter(({ actionName }) => actionName == 'control change'),
        map(({ data, channel }) => ({
          control: data[1]!,
          value: data[2]!,
          channel,
          type: 'control change' as const,
        }))
      ),
    [input]
  );

  return obs;
}

type MIDIMessageData = {
  actionName: ActionNames;
  leastSig: number;
  channel: number;
  data: number[];
};

function extractData(message: MIDIMessageEvent): MIDIMessageData {
  const data = message.data;

  const action = data[0]! & 0xf0; // Mask channel/least significant bits;
  const actionName = getActionName(action);

  const leastSig = data[0]! & 0x0f; // Mask action bits;
  const channel = leastSig + 1;
  return {
    actionName,
    leastSig,
    channel,
    data: [...data],
  };
}

function getActionName(action: number) {
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

type ActionNames = ReturnType<typeof getActionName>;
