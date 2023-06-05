import classNames from 'classnames';
import { useMemo, useState } from 'react';
import {
  MIDIControlChangeFilters,
  MIDINoteFilters,
  ParsedMIDIMessage,
  isControlChangeMessage,
  isNoteMessage,
} from '~/state/midi/types';
import { useMIDIMessageCallback, useCurrentMidiInput } from '~/state/midi';
import Button from './Button';
import {
  useSettingsStore,
  midiMappableActions,
  MIDIMappings,
} from '~/state/settings-store';

type Props = {
  className?: string;
};

const MIDINoteMessageTest = ({ className }: Props) => {
  const input = useCurrentMidiInput();
  const midiMappings = useSettingsStore(state => state.midiMappings);
  const updateMidiMapping = useSettingsStore(state => state.updateMidiMapping);
  const [actionToMap, setActionToMap] = useState<keyof MIDIMappings | null>(
    null
  );
  const onMIDINoteMessage = useMemo(
    () => (message: ParsedMIDIMessage) => {
      if (actionToMap) {
        // TODO: support various types of MIDI messages
        if (isNoteMessage(message) && message.type === 'note on') {
          const newMapping: MIDINoteFilters = {
            channel: message.channel,
            note: message.note,
            type: 'note on',
          };
          updateMidiMapping(actionToMap, newMapping);
        }
        if (isControlChangeMessage(message)) {
          const newMapping: MIDIControlChangeFilters = {
            channel: message.channel,
            value: message.value,
            control: message.control,
            type: 'control change',
          };
          updateMidiMapping(actionToMap, newMapping);
        }

        setActionToMap(null);
      }
    },
    [actionToMap, updateMidiMapping]
  );

  useMIDIMessageCallback(onMIDINoteMessage, input);

  return (
    <div className={classNames('w-full', className)}>
      <h2>Edit MIDI mappings</h2>
      {midiMappableActions.map(action => (
        <div key={action} className="flex flex-row gap-2 w-full">
          <div>{action}</div>
          <Button
            onClick={() => {
              setActionToMap(action === actionToMap ? null : action);
            }}
            label={actionToMap == action ? 'Cancel' : 'Map'}
          />
          {actionToMap === action && (
            <div>
              <div>Press a MIDI key to map to {action}</div>
            </div>
          )}
          {actionToMap !== action && (
            <div>
              {JSON.stringify(midiMappings[action]) || 'No mapping set'}
            </div>
          )}
          {midiMappings[action] && (
            <Button
              onClick={() => {
                updateMidiMapping(action, undefined);
              }}
              label="Remove"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default MIDINoteMessageTest;
