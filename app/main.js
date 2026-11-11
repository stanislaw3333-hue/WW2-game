// Courtyard 1944 — minimal Electron shell
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    backgroundColor: '#000000', title: 'Courtyard 1944', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.maximize();   // open filling the screen (a 2K display gives a much larger view than the 1280x720 default)
  win.loadFile(path.join(__dirname, 'index.html'));
  if (process.env.COURTYARD_SMOKE) {
    win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) console.log('RENDERER-ERR', msg); });
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      const r = await win.webContents.executeJavaScript('({title: document.title, canvases: document.querySelectorAll("canvas").length, w: document.getElementById("game").width})');
      console.log('SMOKE', JSON.stringify(r));
      app.quit();
    }, 2500));
  }
});
app.on('window-all-closed', () => app.quit());
