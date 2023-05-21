import classNames from 'classnames';
import { useCurrentSong, useTracksForCurrentSong } from '~/state/live-set';

type Props = {
  className?: string;
};

const LiveSetDataDisplay = ({ className }: Props) => {
  const currentSong = useCurrentSong();
  const tracks = useTracksForCurrentSong();

  return (
    <div className={classNames('flex flex-col', className)}>
      <DataDisplay label="Song" value={currentSong ?? 'No song selected'} />
      <div className="flex">
        {tracks?.map((track, i) => (
          <DataDisplay
            key={track.id}
            className="flex-1"
            label={'Track ' + i.toString()}
            value={track.name}
          />
        ))}
      </div>
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
