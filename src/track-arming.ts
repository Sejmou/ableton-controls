import { Track } from 'ableton-js/ns/track';

export async function armNextTrack(data: ArmedTrackData) {
  console.log('armNextTrack');
  const { armedTrack, nextTrack } = data;
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
  const trackName = await nextTrack.get('name');
  console.log(`armed track: ${trackName}`);
  await armedTrack.set('arm', false);
}

export async function armPreviousTrack(data: ArmedTrackData) {
  const { armedTrack, previousTrack } = data;
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
  const trackName = await previousTrack.get('name');
  console.log(`armed track: ${trackName}`);
  await armedTrack.set('arm', false);
}

export async function getArmedTrackData(tracks: Track[]) {
  const armedTrackIdx = await findIndexAsync(tracks, track => track.get('arm'));
  const armedTrack = armedTrackIdx !== -1 ? tracks[armedTrackIdx] : undefined;

  const isFirst = armedTrackIdx == 0;
  const isLast = armedTrackIdx == tracks.length - 1;
  return {
    armedTrack,
    nextTrack: !isLast ? tracks[armedTrackIdx + 1] : undefined,
    previousTrack: !isFirst ? tracks[armedTrackIdx - 1] : undefined,
  };
}

type ArmedTrackData = Awaited<ReturnType<typeof getArmedTrackData>>;

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
