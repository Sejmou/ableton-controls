import classNames from 'classnames';
import {
  useSectionsOfCurrentSong,
  useSongSectionLoops,
} from '~/state/live-set';
import { Locator } from '~/state/live-set/songs-and-sections';

type Props = {
  className?: string;
};

const SongSections = ({ className }: Props) => {
  const { sectionLocators, currentSectionLocator } = useSectionsOfCurrentSong();

  // useSongSectionLoops();

  return (
    <div className={classNames('', className)}>
      <h3>Sections</h3>
      <div className="flex flex-col items-center gap-1">
        {sectionLocators.map((locator, i) => (
          <SongSection
            key={i}
            className="flex-1 whitespace-nowrap"
            locator={locator}
            isCurrent={locator.time === currentSectionLocator?.time}
          />
        ))}
      </div>
    </div>
  );
};

export default SongSections;

type SongSectionProps = {
  className?: string;
  locator: Locator;
  isCurrent: boolean;
};

const SongSection = ({ className, locator, isCurrent }: SongSectionProps) => {
  if (isCurrent) console.log('current section', locator.name);
  return (
    <div
      className={classNames(
        'border w-full cursor-pointer',
        isCurrent && 'font-bold',
        className
      )}
      onClick={() => locator.cuePoint.jump()}
    >
      {locator.name}
    </div>
  );
};
