import classNames from 'classnames';
import { useCurrentSong } from '~/state/live-set';

type Props = {
  className?: string;
};

const SongDisplay = ({ className }: Props) => {
  const currentSong = useCurrentSong();

  return (
    <div className={classNames('flex flex-col', className)}>
      <DataDisplay label="Song" value={currentSong ?? 'No song selected'} />
    </div>
  );
};

export default SongDisplay;

type DataDisplayProps = {
  className?: string;
  label: string;
  value: string;
};

const DataDisplay = ({ className, label, value }: DataDisplayProps) => {
  return (
    <div className={classNames('flex flex-col p-4 items-center', className)}>
      <h2>{label}</h2>
      <h1>{value}</h1>
    </div>
  );
};
