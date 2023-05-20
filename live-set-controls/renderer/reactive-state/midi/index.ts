import { Observable, filter, map } from 'rxjs';
import { ControlChangeMessage, NoteMessage } from './types';
import { useMemo } from 'react';

export const midiInputs$ = new Observable<MIDIInput[]>(subscriber => {
  console.log('subscriber called Observable, getting midi access');
  window.navigator.requestMIDIAccess().then(midiAccess => {
    console.log('got midi access');
    const listener = () => {
      console.log('statechange');
      subscriber.next([...midiAccess.inputs.values()]);
    };
    midiAccess.addEventListener('statechange', listener);
    subscriber.next([...midiAccess.inputs.values()]);
    return () => {
      console.log('unsubscribing');
      midiAccess.removeEventListener('statechange', listener);
    };
  });
});

// there must be a better way to do this
function createMIDIMessageObservable(input: MIDIInput) {
  return new Observable<MIDIMessageData>(subscriber => {
    const listener = function (this: MIDIInput, event: Event) {
      const midiMessageEvent = event as MIDIMessageEvent; // not sure why this is necessary
      const data = extractData(midiMessageEvent);
      subscriber.next(data);
    };
    input.addEventListener('midimessage', listener);
    return () => {
      console.log('unsubscribing');
      input.removeEventListener('midimessage', listener);
    };
  });
}

export function useMIDINoteOnStream(input: MIDIInput): Observable<NoteMessage> {
  const obs = useMemo(
    () =>
      createMIDIMessageObservable(input).pipe(
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
  const obs = useMemo(
    () =>
      createMIDIMessageObservable(input).pipe(
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
  const obs = useMemo(
    () =>
      createMIDIMessageObservable(input).pipe(
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
