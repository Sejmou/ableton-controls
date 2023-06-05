import classNames from 'classnames';
import { usePlayback } from '~/state/live-set';
import Button from './Button';
import electron from 'electron';
import { useEffect, useMemo } from 'react';

const ipcRenderer = electron.ipcRenderer;

type Props = {
  className?: string;
};

const SongPlayback = ({ className }: Props) => {
  const { isPlaying, start, stop, resume, record } = usePlayback();

  const handlePlayPause = useMemo(() => {
    return async () => {
      if (isPlaying) {
        await stop();
      } else {
        await start();
      }
    };
  }, [isPlaying, start, stop]);

  useEffect(() => {
    ipcRenderer.on('play-pause', () => {
      handlePlayPause();
    });
    return () => {
      ipcRenderer.removeAllListeners('play-pause');
    };
  }, [handlePlayPause]);

  return (
    <div className={classNames('', className)}>
      <h3>Playback</h3>
      {isPlaying ? 'Playing' : 'Stopped'}
      <Button onClick={handlePlayPause} label={isPlaying ? 'Stop' : 'Play'} />
      <Button onClick={record} label="Record" />
    </div>
  );
};

export default SongPlayback;
