import classNames from 'classnames';
import { useEffect } from 'react';
import { useSoundsForCurrentSong, useCurrentSong } from '~/state/live-set';
import { MIDIOrAudioTrack } from '~/state/live-set/tracks';

type Props = {
  className?: string;
};

const SongSoundSelection = ({ className }: Props) => {
  const sounds = useSoundsForCurrentSong();
  const currentSong = useCurrentSong();
  useEffect(() => {
    sounds?.forEach((sound, i) => {
      if (i === 0) sound.arm();
      else sound.disarm();
    });
  }, [currentSong]);

  return (
    <div
      className={classNames(
        'flex flex-col items-center w-full my-2',
        className
      )}
    >
      <h3>Sounds</h3>
      <div className="grid grid-cols-fr w-full gap-2">
        {sounds?.map(sound => (
          <SoundForSong
            key={sound.id}
            className="flex-1 whitespace-nowrap"
            trackForSound={sound}
          />
        ))}
      </div>
    </div>
  );
};

export default SongSoundSelection;

type SoundProps = {
  className?: string;
  trackForSound: MIDIOrAudioTrack;
};

const SoundForSong = ({ className, trackForSound }: SoundProps) => {
  const toggleArmed = () => {
    if (trackForSound.isArmed) {
      trackForSound.disarm();
    } else {
      trackForSound.arm();
    }
  };
  return (
    <div
      className={classNames(
        'flex flex-col p-4 items-center cursor-pointer',
        trackForSound.isArmed && 'bg-red-500',
        className
      )}
      onClick={toggleArmed}
    >
      <h2>{trackForSound.name}</h2>
    </div>
  );
};
