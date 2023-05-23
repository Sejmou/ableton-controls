import classNames from 'classnames';
import { useSongLocators } from '~/state/live-set';
import { Locator } from '~/state/live-set/songs-and-sections';

type Props = {
  className?: string;
};

const SongDisplay = ({ className }: Props) => {
  const { currentSongLocator, nextSongLocator, previousSongLocator } =
    useSongLocators();

  return (
    <div
      className={classNames(
        'grid grid-cols-3 gap-2 justify-between select-none',
        className
      )}
    >
      {previousSongLocator ? (
        <SongSelector label="Previous" locator={previousSongLocator} />
      ) : (
        <div />
      )}
      <CurrentSongDisplay
        label="Current Song"
        value={currentSongLocator?.name ?? 'No song selected'}
      />
      {nextSongLocator ? (
        <SongSelector label="Next" locator={nextSongLocator} />
      ) : (
        <div />
      )}
    </div>
  );
};

export default SongDisplay;

type SongDisplayProps = {
  className?: string;
  label: string;
  value: string;
};

const CurrentSongDisplay = ({ className, label, value }: SongDisplayProps) => {
  return (
    <div
      className={classNames(
        'flex flex-col p-4 items-center text-center',
        className
      )}
    >
      <h2>{label}</h2>
      <h1>{value}</h1>
    </div>
  );
};

type SongSelectorProps = {
  className?: string;
  label: string;
  locator: Locator;
};

const SongSelector = ({ className, locator, label }: SongSelectorProps) => {
  return (
    <div
      className={classNames(
        'flex flex-col p-4 items-center cursor-pointer scale-50 text-center',
        className
      )}
      onClick={() => locator.cuePoint.jump()}
    >
      <h2>{label}</h2>
      <h1>{locator.name}</h1>
    </div>
  );
};
