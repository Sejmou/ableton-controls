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
      <div className="flex flex-col p-4 items-center">
        <h3>Current Song</h3>
        <h2>{currentSong}</h2>
      </div>
    </div>
  );
};

export default LiveSetDataDisplay;
