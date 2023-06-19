import classNames from 'classnames';
import { Label, Select } from 'flowbite-react';
import { useEffect } from 'react';
import { useSoundsForCurrentSong, useCurrentSong } from '~/state/live-set';
import { MIDIOrAudioTrack } from '~/state/live-set/tracks';
import { useSettingsStore } from '~/state/settings-store';

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
        {sounds?.map((sound, i) => (
          <SoundForSong
            key={i}
            className="flex-1 whitespace-nowrap"
            trackForSound={sound}
          />
        ))}
      </div>
      <SongSoundMonitorModeSelect />
    </div>
  );
};

export default SongSoundSelection;

type SoundProps = {
  className?: string;
  trackForSound: MIDIOrAudioTrack;
};

const SoundForSong = ({ className, trackForSound }: SoundProps) => {
  const toggleMute = () => {
    if (trackForSound.isMuted) {
      trackForSound.unmute();
    } else {
      trackForSound.mute();
    }
  };

  const toggleArmed = () => {
    if (trackForSound.isArmed) {
      trackForSound.disarm();
    } else {
      trackForSound.arm();
    }
  };
  return (
    <div className={classNames('flex flex-col p-4 items-center', className)}>
      <h2
        onClick={toggleMute}
        className={classNames(trackForSound.isMuted && 'line-through')}
      >
        {trackForSound.name}
      </h2>
      <div className="flex gap-2 justify-between">
        <div
          className={classNames(
            'cursor-pointer',
            trackForSound.isArmed && 'bg-red-500'
          )}
          onClick={toggleArmed}
        >
          {!trackForSound.isArmed && 'not'} armed
        </div>
        <div>
          {monitorModes.map(mode => (
            <div
              className={classNames(
                'w-full cursor-pointer',
                trackForSound.monitorMode == mode && monitorModeColors[mode]
              )}
              onClick={() => {
                trackForSound.setMonitorMode(mode);
              }}
            >
              {mode}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type MonitorModeSelectProps = {
  className?: string;
};

const SongSoundMonitorModeSelect = ({ className }: MonitorModeSelectProps) => {
  const monitorMode = useSettingsStore(state => state.songSoundsMonitorMode);
  const setMonitorMode = useSettingsStore(
    state => state.setSongSoundsMonitorMode
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonitorMode(e.target.value as 'in' | 'auto' | undefined);
  };

  return (
    <div className={className}>
      <div className="w-full" id="select">
        <div className="mb-2 block">
          <Label
            htmlFor="song-sounds-monitor-mode"
            value="Default monitor mode for song sounds:"
          />
        </div>
        <Select
          id="midi-inputs"
          className="border rounded p-2"
          required={false}
          onChange={handleSelectChange}
          value={monitorMode}
        >
          <option className="border-0" value="">
            {'(Keep settings from Live Set)'}
          </option>
          {['in', 'auto'].map(mode => (
            <option className="border-0" key={mode} value={mode}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};

type MonitorMode = MIDIOrAudioTrack['monitorMode'];
const monitorModes: readonly MonitorMode[] = ['in', 'auto', 'off'] as const;
const monitorModeColors: Record<MonitorMode, string> = {
  in: 'bg-blue-500',
  auto: 'bg-yellow-500',
  off: 'bg-yellow-500',
};
