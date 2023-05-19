import classNames from 'classnames';
import { useObservableState } from 'observable-hooks';
import { currentSong$ } from '~/reactive-state/live-set';

type Props = {
  className?: string;
};

const LiveSetDataDisplay = ({ className }: Props) => {
  const currentSong = useObservableState(currentSong$);

  return (
    <div className={classNames('flex flex-col', className)}>
      <DataDisplay label="Song" value={currentSong ?? 'No song selected'} />
    </div>
  );
};

export default LiveSetDataDisplay;

type DataDisplayProps = {
  className?: string;
  label: string;
  value: string;
};

export const DataDisplay = ({ className, label, value }: DataDisplayProps) => {
  return (
    <div className={classNames('flex flex-col p-4 items-center', className)}>
      <h3>{label}</h3>
      <h2>{value}</h2>
    </div>
  );
};
