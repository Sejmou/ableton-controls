import classNames from 'classnames';
import { useState } from 'react';
import {
  useMIDIMessageCallback,
  useCurrentMidiInput,
  matchesFilters,
} from '~/state/midi';
import { MIDINoteFilters } from '~/state/midi/types';
import Input from './Input';
import { Field, Formik } from 'formik';
import { ParsedMIDIMessage } from '~/state/midi/types';
import Button from './Button';

type Props = {
  className?: string;
};
const MIDINoteMessageTest = ({ className }: Props) => {
  const input = useCurrentMidiInput();
  const [filters, setFilters] = useState<MIDINoteFilters>({
    type: 'note on',
  });
  const [currentColor, setCurrentColor] = useState<string>('black');
  const onMIDINoteMessage = (message: ParsedMIDIMessage) => {
    if (matchesFilters(message, filters)) {
      setCurrentColor(generateRandomColorString());
    }
  };
  useMIDIMessageCallback(onMIDINoteMessage, input);

  return (
    <Formik<MIDINoteFilters>
      initialValues={filters}
      onSubmit={values => {
        setFilters(values);
      }}
    >
      {({ values, handleChange, handleBlur, handleSubmit }) => (
        <form
          className={classNames('flex flex-col', className)}
          onSubmit={handleSubmit}
        >
          <h3>Test note on message listener</h3>
          <p style={{ color: currentColor }}>
            The color of this text should change with every note on MIDI event
            matching the filters below.
          </p>
          <h4>Current Note Filters:</h4>
          {JSON.stringify(filters)}
          <h4>Update Filters</h4>
          <div className="flex flex-row gap-2">
            <Field
              className="flex-1"
              component={Input}
              value={values.note}
              id="note"
              type="number"
              label="Note"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <Field
              className="flex-1"
              component={Input}
              value={values.channel}
              id="channel"
              type="number"
              label="Channel"
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>
          <Button type="submit" label="Apply" />
        </form>
      )}
    </Formik>
  );
};

export default MIDINoteMessageTest;

function generateRandomColorString() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}
