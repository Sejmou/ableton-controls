import { Ableton } from 'ableton-js';
import {
  armNextTrack,
  armPreviousTrack,
  getArmedTrackData,
} from './track-arming';
import { createSongAndSection$ } from './reactive-state/songs-and-sections';
import { createTracksAndTrackGroups$ } from './reactive-state/tracks';
import { createMidiInputStream$ } from './midi';
import {
  combineLatest,
  filter,
  mergeMap,
  throttleTime,
  withLatestFrom,
  buffer,
  debounceTime,
  BehaviorSubject,
  map,
} from 'rxjs';
import { keyPresses$ } from './reactive-state/key-presses';

// Log all messages to the console
const ableton = new Ableton({ logger: console });

const main = async () => {
  await ableton.start();

  const {
    currentSong$,
    currentSection$,
    currentSectionLocator$,
    nextSectionLocator$,
    previousSectionLocator$,
    currentSongLocator$,
    nextSongLocator$,
    previousSongLocator$,
  } = await createSongAndSection$(ableton);

  combineLatest([currentSong$, currentSection$]).subscribe(
    ([song, section]) => {
      if (song)
        console.log(`Current song: ${song}`, section ? `(${section})` : '');
    }
  );

  const midiInputPortName = 'BT500S';
  const { noteOn$ } = await createMidiInputStream$(midiInputPortName);

  // track switching
  const tracksAndTrackGroups$ = await createTracksAndTrackGroups$(ableton);

  const songNameSoundGroupOverride: Record<string, string> = {
    'Slow Dancing (Live)': 'Slow Dancing',
    'Slow Dancing (Studio)': 'Slow Dancing',
  };

  const tracksForCurrentSong$ = combineLatest([
    tracksAndTrackGroups$,
    currentSong$,
  ]).pipe(
    mergeMap(async ([tracks, currentSong]) => {
      const soundsGroupName = 'Guitar Sounds'; // TODO: make this configurable
      const soundGroups = tracks.find(t => t.name === soundsGroupName);
      if (!soundGroups || soundGroups.type !== 'group') {
        console.warn(`Track group '${soundsGroupName}' not found`);
        return [];
      }
      const soundGroupOverride =
        currentSong && songNameSoundGroupOverride[currentSong];
      if (soundGroupOverride)
        console.log(
          `Using sound group '${soundGroupOverride}' for song '${currentSong}'`
        );
      const soundGroupName = soundGroupOverride || currentSong;

      const songSoundGroup = soundGroups.children.find(
        t => t.name === soundGroupName && t.type === 'group'
      );

      const fallbackSoundGroupName = 'Default';
      if (!songSoundGroup) {
        console.warn(
          `Sounds for current song '${currentSong}' not found, using default sounds from '${fallbackSoundGroupName}'`
        );
      }
      const fallbackSoundGroup = soundGroups.children.find(
        t => t.name === fallbackSoundGroupName && t.type === 'group'
      );

      const soundGroup = songSoundGroup || fallbackSoundGroup;

      if (!soundGroup || soundGroup.type !== 'group') {
        // latter check is just to make typescript happy
        console.warn(`No sounds could be found for '${currentSong}'.`);
        return [];
      }

      const tracksForCurrentSong = soundGroup.children.filter(
        t => t.type === 'midiOrAudio'
      );

      return tracksForCurrentSong;
    })
  );

  tracksForCurrentSong$.subscribe(tracks => {
    console.log(
      `Tracks for current song:`,
      tracks.map(t => t.name)
    );
  });

  const currentSongAbletonJsTracks$ = tracksForCurrentSong$.pipe(
    mergeMap(async tracks => {
      const abletonJsTracks = tracks.map(t => t.abletonJsTrack);

      let someTrackArmed = false;
      for (const track of abletonJsTracks) {
        const armed = await track.get('arm');
        if (armed) {
          someTrackArmed = true;
          break;
        }
      }
      if (!someTrackArmed) abletonJsTracks[0].set('arm', true);
      return abletonJsTracks;
    })
  );

  const armedTracks$ = currentSongAbletonJsTracks$.pipe(
    mergeMap(getArmedTrackData)
  );

  const trackSwitch$ = noteOn$.pipe(filter(m => m.channel == 1 && m.note == 1));
  trackSwitch$
    .pipe(buffer(trackSwitch$.pipe(throttleTime(500), debounceTime(500))))
    .pipe(withLatestFrom(armedTracks$))
    .subscribe(async ([messages, tracks]) => {
      if (messages.length > 1) {
        await armPreviousTrack(tracks);
      } else {
        await armNextTrack(tracks);
      }
    });

  // song switching
  const songSwitch$ = noteOn$.pipe(filter(m => m.channel == 1 && m.note == 0));
  songSwitch$
    .pipe(buffer(songSwitch$.pipe(throttleTime(500), debounceTime(500))))
    .pipe(withLatestFrom(nextSongLocator$, previousSongLocator$, armedTracks$))
    .subscribe(([messages, next, previous, armedTracks]) => {
      const locator = messages.length > 1 ? previous : next;
      if (locator) {
        ableton.song.set('current_song_time', locator.time);
        armedTracks.armedTrack?.set('arm', false);
      }
    });

  // play/pause
  // customized so that playback always starts at the beginning of the current song
  const playPause$ = noteOn$.pipe(filter(m => m.channel == 2 && m.note == 2));

  type StartPlaybackOptions = 'current song' | 'current section';
  let startPlaybackOption: StartPlaybackOptions = 'current song';
  const currentStartPlaybackOption$ = new BehaviorSubject<StartPlaybackOptions>(
    startPlaybackOption
  );

  currentStartPlaybackOption$.subscribe(
    option =>
      void console.log(`hitting play button will start playback from ${option}`)
  );

  playPause$
    .pipe(
      buffer(playPause$.pipe(throttleTime(500), debounceTime(500))),
      filter(messages => messages.length == 1), // makes this emit only on single tap
      withLatestFrom(
        currentSongLocator$,
        currentSectionLocator$,
        currentStartPlaybackOption$
      )
    )
    .subscribe(async ([_, songLocator, sectionLocator, playbackOption]) => {
      const playing = await ableton.song.get('is_playing');
      const locator =
        playbackOption === 'current song' ? songLocator : sectionLocator;
      if (!playing) {
        if (!locator) {
          console.warn(
            `attempted to start playback from ${playbackOption}, but no locator was found`
          );
          return;
        }
        console.log(`starting playback from '${locator.name}'`);
        await locator.cuePoint.jump();
      }

      await ableton.song.set('is_playing', !playing);
    });

  playPause$
    .pipe(
      buffer(playPause$.pipe(throttleTime(500), debounceTime(500))),
      filter(messages => messages.length > 1) // makes this emit only on double tap
    )
    .subscribe(() => {
      startPlaybackOption =
        startPlaybackOption === 'current song'
          ? 'current section'
          : 'current song';
      currentStartPlaybackOption$.next(startPlaybackOption);
    });

  // section switching
  const sectionSwitch$ = noteOn$.pipe(
    filter(m => m.channel == 1 && m.note == 3)
  );
  sectionSwitch$
    .pipe(buffer(sectionSwitch$.pipe(throttleTime(500), debounceTime(500))))
    .pipe(withLatestFrom(nextSectionLocator$, previousSectionLocator$))
    .subscribe(([messages, next, previous]) => {
      const locator = messages.length > 1 ? previous : next;
      if (locator) {
        ableton.song.set('current_song_time', locator.time);
      }
    });

  // loop settings - controlled via keyboard as my MIDI footswitch doesn't have enough buttons
  const loopStartKeybindingPress$ = keyPresses$.pipe(
    filter(({ downKeyMap }) => !!downKeyMap['S'] && !!downKeyMap['LEFT ALT'])
  );
  loopStartKeybindingPress$
    .pipe(withLatestFrom(currentSectionLocator$))
    .subscribe(async ([_, locator]) => {
      if (!locator) {
        console.warn(
          `attempted to set loop start, but no current section was found`
        );
        return;
      }
      console.log(`setting loop start to '${locator.name}'`);

      const newLoopStartTime = locator.time;
      const currentLoopStartTime = await ableton.song.get('loop_start');
      const currentLoopEndTime =
        (await ableton.song.get('loop_length')) + currentLoopStartTime;
      const loopLength = currentLoopEndTime - newLoopStartTime;
      console.log(loopLength);

      await ableton.song.set('loop_start', 0); // temporarily set loop start to 0 so that we can set loop length to any value up to the song length without producing an error
      await ableton.song.set('loop_length', loopLength);
      await ableton.song.set('loop_start', newLoopStartTime);
    });

  const loopEndKeybindingPress$ = keyPresses$.pipe(
    filter(({ downKeyMap }) => !!downKeyMap['E'] && !!downKeyMap['LEFT ALT'])
  );
  loopEndKeybindingPress$
    .pipe(
      withLatestFrom(
        currentSectionLocator$,
        nextSectionLocator$,
        nextSongLocator$
      )
    )
    .subscribe(async ([_, currentSection, nextSection, nextSong]) => {
      console.log('setting loop end');
      if (!currentSection) {
        console.warn(
          `attempted to set loop end, but no current section was found`
        );
        return;
      }
      const currentTime = Math.round(
        await ableton.song.get('current_song_time')
      );
      const isCuePointSelected = await ableton.song.isCuePointSelected();
      const locatorToSetAsLoopEnd =
        isCuePointSelected && currentSection.time == currentTime
          ? currentSection
          : nextSection || nextSong;

      const loopStart = await ableton.song.get('loop_start');
      console.log(
        'setting loop end to',
        locatorToSetAsLoopEnd ? `'${locatorToSetAsLoopEnd.name}'` : 'end of set'
      );
      const loopEnd = locatorToSetAsLoopEnd
        ? locatorToSetAsLoopEnd.time
        : await ableton.song.get('song_length');

      const loopLength = loopEnd - loopStart;
      await ableton.song.set('loop_length', loopLength);
    });

  // loop toggle is included in Ableton Live's default keymap, so no need to implement it here (shortcut is 'cmd+L')

  // tuner
  tracksAndTrackGroups$.pipe(
    map(tracksAndTrackGroups => {
      const tunerTrack = tracksAndTrackGroups.find(
        track => track.name === 'Tuner'
      );
      if (!tunerTrack || !(tunerTrack.type === 'midiOrAudio')) {
        console.warn(
          'no tuner track found. Make sure to add one to your set (named "Tuner", placed at root level)'
        );
        return;
      }
      return tunerTrack;
    })
  );

  // idea: add key binding to toggle tuner track on/off via custom key mapping in Ableton Live

  // this doesn't have to be done here, as it can easily be done directly in Ableton Live:
  // first, add a tuner track to your set
  // then, hit 'cmd+k' in Ableton Live and click the solo button of the tuner track to add a key binding
  // hit 'cmd+k' again to exit key binding mode
};

main();
