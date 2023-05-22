import classNames from 'classnames';
import { usePlaybackTracksForCurrentSong } from '~/state/live-set';
import { GroupTrack, MIDIOrAudioTrack } from '~/state/live-set/tracks';

type Props = {
  className?: string;
};

const SongPlaybackTracks = ({ className }: Props) => {
  const tracks = usePlaybackTracksForCurrentSong();
  return (
    <div
      className={classNames(
        'flex flex-col items-center w-full my-2',
        className
      )}
    >
      <h3>Playback tracks</h3>
      <div className="grid grid-cols-fr w-full gap-2">
        {tracks?.map(track => (
          <PlaybackTrack
            key={track.id}
            className="flex-1 whitespace-nowrap"
            track={track}
          />
        ))}
      </div>
    </div>
  );
};

export default SongPlaybackTracks;

type PlaybackTrackProps = {
  className?: string;
  track: MIDIOrAudioTrack | GroupTrack;
};

const PlaybackTrack = ({ className, track }: PlaybackTrackProps) => {
  const toggleMute = () => {
    if (track.isMuted) {
      track.unmute();
    } else {
      track.mute();
    }
  };
  return (
    <div
      className={classNames(
        'flex flex-col p-4 items-center cursor-pointer',
        track.isMuted && 'line-through',
        className
      )}
      onClick={toggleMute}
    >
      <h2>{track.name}</h2>
    </div>
  );
};
