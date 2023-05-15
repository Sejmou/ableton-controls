// for this to work on Mac you need to give 'Accesibility' permissions to VS Code (Settings -> Security & Privacy -> Accesibility -> set toggle for VS Code to on))
import {
  GlobalKeyboardListener,
  IGlobalKeyDownMap,
  IGlobalKeyEvent,
} from 'node-global-key-listener';
import { Subject } from 'rxjs';

const v = new GlobalKeyboardListener();

type KeyDownData = {
  event: IGlobalKeyEvent;
  downKeyMap: IGlobalKeyDownMap;
};

const keyDown = new Subject<KeyDownData>();

export const keyPresses$ = keyDown.asObservable();

v.addListener(function (event, downKeyMap) {
  keyDown.next({ event, downKeyMap });
});
