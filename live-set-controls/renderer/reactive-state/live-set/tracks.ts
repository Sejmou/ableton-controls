import { Ableton } from 'ableton-js';
import { Track } from 'ableton-js/ns/track';
import { BehaviorSubject, forkJoin, map, mergeMap } from 'rxjs';

export async function createTracksAndTrackGroups$(ableton: Ableton) {
  const initialTracks = await ableton.song.get('tracks');
  for (const track of initialTracks) {
    const canBeArmed = await track.get('can_be_armed');
    if (!canBeArmed) continue;
    track.addListener('arm', async () => {
      tracks$.next(await ableton.song.get('tracks'));
    });
  }
  const tracks$ = new BehaviorSubject(initialTracks);
  ableton.song.addListener('tracks', async tracks => {
    tracks$.next(tracks);
    for (const track of tracks) {
      const canBeArmed = await track.get('can_be_armed');
      if (!canBeArmed) continue;
      track.addListener('arm', async () => {
        tracks$.next(await ableton.song.get('tracks'));
      });
    }
  });

  const trackData$ = tracks$.pipe(
    mergeMap(tracks =>
      forkJoin(
        tracks.map(track =>
          forkJoin({
            name: track.get('name'),
            id: Promise.resolve(track.raw.id),
            parentId: track.get('group_track').then(t => t?.id),
            canBeArmed: track.get('can_be_armed'),
            abletonJsTrack: Promise.resolve(track),
          })
        )
      )
    ),
    map(tracks => {
      return tracks.map(t => {
        const { canBeArmed, name, parentId, id, abletonJsTrack } = t;

        if (canBeArmed) {
          const type = 'midiOrAudio' as const; // I don't fully understand why this is necessary, but it is
          return {
            name,
            parentId,
            id,
            type,
            abletonJsTrack,
          };
        } else {
          const type = 'group' as const;
          return { name, parentId, id, children: [], type, abletonJsTrack };
        }
      });
    }),
    map((tracks: (GroupTrack | MIDIOrAudioTrack)[]) => {
      tracks.map((track, _, arr) => {
        if (track.parentId) {
          const parent = arr.find(t => t.id === track.parentId);
          if (parent && parent.type === 'group') parent.children.push(track);
          else
            console.warn('parent is not a valid group track', {
              track,
              parent,
            }); // should never be the case
        }
      });
      return tracks.filter(track => !track.parentId);
    })
  );

  return trackData$;
}

type LiveSetTrack = GroupTrack | MIDIOrAudioTrack;

type TrackBase = {
  // tracks are either MIDI/audio tracks or group tracks that are used to group MIDI/audio tracks or other group tracks
  // Midi/audio tracks extend this type with arm and disarm methods (see below)
  id: string;
  name: string;
  parentId?: string;
  abletonJsTrack: Track;
};

export type GroupTrack = TrackBase & {
  type: 'group';
  // group tracks can contain other group tracks or MIDI/audio tracks
  // however, they can NOT be armed or disarmed - attempting to do so will throw an error
  children: LiveSetTrack[];
};

export type MIDIOrAudioTrack = TrackBase & {
  type: 'midiOrAudio';
  // MIDI and audio tracks are at the lowest level in the 'track hierarchy', i.e. they can not contain other tracks
  // they can be armed and disarmed safely
};
