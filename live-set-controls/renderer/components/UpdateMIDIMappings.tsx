import classNames from 'classnames';
import { useMemo, useState } from 'react';
import {
  MIDINoteFilters,
  useMIDINoteCallback,
  useCurrentMidiInput,
} from '~/state/midi';
import { NoteMessage } from '~/state/midi/types';
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
    () => (message: NoteMessage) => {
      if (actionToMap) {
        const newMapping: MIDINoteFilters = {
          channel: message.channel,
          note: message.note,
          type: 'note on', // TODO: support various types of MIDI messages
        };
        updateMidiMapping(actionToMap, newMapping);
        setActionToMap(null);
      }
    },
    [actionToMap, updateMidiMapping]
  );

  useMIDINoteCallback(onMIDINoteMessage, input);

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
        </div>
      ))}
    </div>
  );
};

export default MIDINoteMessageTest;
