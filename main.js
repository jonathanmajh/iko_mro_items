// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const { isDev } = require('electron-is-dev');
const path = require('path');
const { appUpdater } = require('./assets/autoupdater');

if (require('electron-squirrel-startup')) {
  app.quit();
}

ipcMain.on('openSettings', (event, somearg) => {
  console.log([somearg, event, 'opening settings']);
  const settingWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
    }
  })

  settingWindow.loadFile(path.join('renderer', 'setting.html'))
  settingWindow.webContents.openDevTools()
})

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js'),
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join('renderer', 'index.html'))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
  page.once('did-frame-finish-load', () => {
    const checkOS = isWindowsOrmacOS();
    if (checkOS && !isDev) {
      // Initate auto-updates on macOs and windows
      appUpdater();
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

function isWindowsOrmacOS() {
  return process.platform === 'darwin' || process.platform === 'win32';
}