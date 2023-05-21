import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import { globalShortcut } from 'electron';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
  });

  // for sending messages to control Ableton to the renderer
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send('play-pause');
  });

  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send('next-track');
  });

  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send('previous-track');
  });

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on('window-all-closed', () => {
  app.quit();
  globalShortcut.unregisterAll();
});
