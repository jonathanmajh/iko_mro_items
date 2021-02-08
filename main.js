// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path');
const { appUpdater } = require('./assets/autoupdater');

if (require('electron-squirrel-startup')) {
  app.quit();
}

ipcMain.on('openSettings', (event, arg) => {
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


ipcMain.on('getVersion', (event, arg) => {
  event.returnValue = app.getVersion();
})

function createWindow() {
  // Create the browser window.
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const mainWindow = new BrowserWindow({
    width: width/2,
    height: height,
    x: 0,
    y: 0,
    autoHideMenuBar: true,
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

  const page = mainWindow.webContents;

  page.once('did-frame-finish-load', () => {
    console.log("checking for updates")
    appUpdater();
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