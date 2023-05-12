import { Observable } from 'rxjs';
import { MIDIInputHandler } from './midi';
import { Track } from 'ableton-js/ns/track';

type Config = {
  midiInputPortName: string;
  tracks$: Observable<Track[]>;
};

export class TrackManager {
  private tracks: Track[] = [];

  constructor(config: Config) {
    config.tracks$.subscribe(tracks => {
      this.tracks = tracks;
    });
    const midiInputPortName = config.midiInputPortName;

    this.input = new MIDIInputHandler(midiInputPortName);
    this.input.addNoteOnListener(
      () => {
        this.armNextTrack();
      },
      {
        note: 1,
        channel: 1,
      }
    );

    this.input.addNoteOnListener(
      () => {
        this.armPreviousTrack();
      },
      {
        note: 0,
        channel: 1,
      }
    );
  }

  private input: MIDIInputHandler;
  private armedTrackName?: string;

  private get armedTrackData() {
    return async () => {
      const tracks = this.tracks;
      const armedTrackIdx = await findIndexAsync(tracks, track =>
        track.get('arm')
      );
      const armedTrack =
        armedTrackIdx !== -1 ? tracks[armedTrackIdx] : undefined;

      const trackName = await armedTrack?.get('name');
      if (this.armedTrackName !== trackName) {
        console.log('armed track:', await armedTrack?.get('name'));
        this.armedTrackName = trackName;
      }

      const isFirst = armedTrackIdx == 0;
      const isLast = armedTrackIdx == tracks.length - 1;
      return {
        armedTrack,
        nextTrack: !isLast ? tracks[armedTrackIdx + 1] : undefined,
        previousTrack: !isFirst ? tracks[armedTrackIdx - 1] : undefined,
      };
    };
  }

  private async armNextTrack() {
    const { armedTrack, nextTrack } = await this.armedTrackData();
    if (!armedTrack) {
      console.warn('no armed track found');
      return;
    }
    if (!nextTrack) {
      return;
    }
    await nextTrack.set('arm', true);
    const armedNext = await nextTrack.get('arm');
    if (!armedNext) {
      console.warn('failed to arm next track');
      return;
    }
    await armedTrack.set('arm', false);
  }

  private async armPreviousTrack() {
    const { armedTrack, previousTrack } = await this.armedTrackData();
    if (!armedTrack) {
      console.warn('no armed track found');
      return;
    }
    if (!previousTrack) {
      return;
    }
    await previousTrack.set('arm', true);
    const armedPrevious = await previousTrack.get('arm');
    if (!armedPrevious) {
      console.warn('failed to arm previous track');
      return;
    }
    await armedTrack.set('arm', false);
  }
}

async function findIndexAsync<T>(
  arr: T[],
  predicate: (item: T) => Promise<boolean>
): Promise<number> {
  for (let i = 0; i < arr.length; i++) {
    if (await predicate(arr[i])) {
      return i;
    }
  }
  return -1;
}
