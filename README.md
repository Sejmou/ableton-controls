# Custom Ableton Controls

In this repo you can find code I wrote to customize Ableton Live to my liking, controlling some stuff programmatically which isn't possible with regular MIDI mappings. I use the awesome [`ableton-js`](https://www.npmjs.com/package/ableton-js) package for communicating with Ableton via a Node program. The [`midi`](https://www.npmjs.com/package/midi) package brings MIDI capabilities to Node.

## Features

 - switch through tracks in Live Set via MIDI, arming the current track and disarming the previous one automatically
