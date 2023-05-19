import { useEffect, useRef } from 'react';
import { ControlChangeMessage, NoteMessage } from './types';
import { Observable, Subject, filter, map } from 'rxjs';

const midiInputSubject$ = new Subject<MIDIInput[]>();

async function init() {
  if (typeof window === 'undefined') return;
  const midiAccess = await window.navigator.requestMIDIAccess();
  const inputs = midiAccess.inputs.values();
  console.log([...inputs]);
  midiAccess.addEventListener('statechange', () => {
    midiInputSubject$.next([...midiAccess.inputs.values()]);
  });
  midiInputSubject$.next([...midiAccess.inputs.values()]);
}

init();

export const midiInputs$ = midiInputSubject$.asObservable();

export function useMidiInputMessageStreams(input: MIDIInput) {
  const midiMessageData$Ref = useRef(new Subject<MIDIMessageData>());
  useEffect(() => {
    input.onmidimessage = function (this, event: Event) {
      const message = event as MIDIMessageEvent;
      const data = extractData(message);
      const midiMessageData$ = midiMessageData$Ref.current;
      midiMessageData$.next(data);
    };
    return () => {
      input.onmidimessage = null;
    };
  }, [input]);

  const midiMessageData$ = midiMessageData$Ref.current;

  const noteOn$: Observable<NoteMessage> = midiMessageData$.pipe(
    filter(({ actionName }) => actionName == 'note on'),
    map(({ data, channel }) => ({
      note: data[1]!,
      velocity: data[2]!,
      channel,
      type: 'note on',
    }))
  );

  const noteOff$: Observable<NoteMessage> = midiMessageData$.pipe(
    filter(({ actionName }) => actionName == 'note off'),
    map(({ data, channel }) => ({
      note: data[1]!,
      velocity: data[2]!,
      channel,
      type: 'note off',
    }))
  );

  const controlChange$: Observable<ControlChangeMessage> =
    midiMessageData$.pipe(
      filter(({ actionName }) => actionName == 'control change'),
      map(({ data, channel }) => ({
        control: data[1]!,
        value: data[2]!,
        channel,
        type: 'control change',
      }))
    );

  return {
    midiMessageData$,
    noteOn$,
    noteOff$,
    controlChange$,
  };
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
