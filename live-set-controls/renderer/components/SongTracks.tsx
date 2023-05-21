import classNames from 'classnames';
import { useTracksForCurrentSong } from '~/state/live-set';
import { MIDIOrAudioTrack } from '~/state/live-set/tracks';

type Props = {
  className?: string;
};

const SongTracks = ({ className }: Props) => {
  const tracks = useTracksForCurrentSong();
  return (
    <div
      className={classNames(
        'flex flex-col items-center w-full my-2',
        className
      )}
    >
      <h3>Tracks</h3>
      <div className="grid grid-cols-fr w-full gap-2">
        {tracks?.map((track, i) => (
          <SongTrack
            key={track.id}
            className="flex-1 whitespace-nowrap"
            track={track}
          />
        ))}
      </div>
    </div>
  );
};

export default SongTracks;

type TrackProps = {
  className?: string;
  track: MIDIOrAudioTrack;
};

const SongTrack = ({ className, track }: TrackProps) => {
  console.log('track', track);
  const toggleArmed = () => {
    if (track.isArmed) {
      track.disarm();
    } else {
      track.arm();
    }
  };
  return (
    <div
      className={classNames(
        'flex flex-col p-4 items-center',
        track.isArmed && 'bg-red-500',
        className
      )}
      onClick={toggleArmed}
    >
      <h2>{track.name}</h2>
    </div>
  );
};
