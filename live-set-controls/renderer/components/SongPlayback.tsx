import classNames from 'classnames';
import { useCurrentSongLocator, usePlayback } from '~/state/live-set';
import Button from './Button';
import electron from 'electron';
import { useEffect, useMemo } from 'react';

const ipcRenderer = electron.ipcRenderer;

type Props = {
  className?: string;
};

const SongPlayback = ({ className }: Props) => {
  const locator = useCurrentSongLocator();
  const { isPlaying, start, stop, resume } = usePlayback();

  const handlePlayPause = useMemo(() => {
    return async () => {
      if (isPlaying) {
        await stop();
      } else {
        await locator?.cuePoint.jump();
        await start();
      }
    };
  }, [isPlaying, locator, start, stop]);

  useEffect(() => {
    ipcRenderer.on('play-pause', () => {
      handlePlayPause();
    });
    return () => {
      ipcRenderer.removeAllListeners('play-pause');
    };
  }, [handlePlayPause]);

  const playingString = isPlaying ? 'Playing' : 'Stopped';

  return (
    <div className={classNames('', className)}>
      <h3>Playback</h3>
      {playingString}
      <Button onClick={handlePlayPause} label={isPlaying ? 'Stop' : 'Start'} />
    </div>
  );
};

export default SongPlayback;
