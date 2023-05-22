import classNames from 'classnames';
import { useCurrentSong, useSongLocators } from '~/state/live-set';
import { Locator } from '~/state/live-set/songs-and-sections';

type Props = {
  className?: string;
};

const SongDisplay = ({ className }: Props) => {
  const { currentSongLocator, nextSongLocator, previousSongLocator } =
    useSongLocators();

  return (
    <div className={classNames('flex flex-row gap', className)}>
      <SongSelector label="Previous" locator={previousSongLocator} />
      <CurrentSongDisplay
        label="Current Song"
        value={currentSongLocator?.name ?? 'No song selected'}
      />
      <SongSelector label="Next" locator={nextSongLocator} />
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
  locator?: Locator;
};

const SongSelector = ({ className, locator, label }: SongSelectorProps) => {
  return (
    <div
      className={classNames(
        'flex flex-col p-4 items-center cursor-pointer scale-50 text-center',
        className
      )}
      onClick={() => locator?.cuePoint.jump()}
    >
      <h2>{label}</h2>
      <h1>{locator?.name}</h1>
    </div>
  );
};
