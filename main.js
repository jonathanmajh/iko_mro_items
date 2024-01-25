// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, screen, dialog, shell} = require('electron');
const path = require('path');
const fs = require('fs');
const {appUpdater} = require('./src/misc/autoupdater.js');
const CONSTANTS = require('./src/misc/constants.js');
require('electron-reload')(__dirname);
let mainWindow;
let settingWindow;

if (require('electron-squirrel-startup')) {
  app.quit();
}
// Write eml file
ipcMain.on('write-file', (event, emailData) => {
  const pathToFile = path.resolve(__dirname, 'downloadedFile.eml');
  fs.writeFile(pathToFile, emailData, (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
    } else {
      shell.openPath(pathToFile)
          .then(() => {
            sleep(2000).then(() => {
            // Delete the file after opening
              fs.unlink(pathToFile, (err) => {
                if (err) {
                  console.error(`Error deleting file: ${err}`);
                } else {
                  console.log('File deleted successfully');
                }
              });
            },
            )
                .catch((err) => {
                  console.error(`Error opening file: ${err}`);
                });
          });
    }
  });
});

ipcMain.on('openSettings', (event, arg) => {
  settingWindow = new BrowserWindow({
    parent: mainWindow,
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
    },
  });

  settingWindow.loadFile(path.join('src', 'renderer', 'setting.html'));
  settingWindow.show();
  settingWindow.on('closed', () => {
    mainWindow.show();
    settingWindow = null;
  });
  if(CONSTANTS.OPEN_DEV_TOOLS) {
    settingWindow.webContents.openDevTools()
  }
});

ipcMain.on('getVersion', (event, arg) => {
  event.returnValue = app.getVersion();
});

ipcMain.handle('select-to-be-translated', async (event, arg) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Spreadsheet',
    filters: [
      {name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb']},
    ],
    properties: [
      'openFile',
    ],
  });
  return result;
});

ipcMain.handle('select-excel-file', async (event, arg) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Excel Spreadsheet',
    filters: [
      {name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb']},
    ],
    properties: [
      'openFile',
    ],
  });
  return result;
});

ipcMain.handle('select-translations', async (event, arg) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Translation Definition Spreadsheet',
    filters: [
      {name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb']},
    ],
    properties: [
      'openFile',
    ],
  });
  return result;
});

ipcMain.on('getPath', (event, arg) => {
  event.returnValue = app.getPath('userData');
});

ipcMain.on('loading', (event, arg) => {
  mainWindow.loadFile(path.join('src', 'renderer', 'item_main.html'));
});

ipcMain.on('start_item_module', (event, arg) => {
  mainWindow.loadFile(path.join('src', 'renderer', 'item_loading.html'));
});

ipcMain.on('start_observation_template', (event, arg) => {
  mainWindow.loadFile(path.join('src', 'renderer', 'observation_template.html'));
});

ipcMain.on('start_item_translate', (event, arg) => {
  mainWindow.loadFile(path.join('src', 'renderer', 'item_translation.html'));
});

ipcMain.on('start_asset_translate', (event, arg) => {
  mainWindow.loadFile(path.join('src', 'renderer', 'asset_translation.html'));
});

function createWindow() {
  // Create the browser window.
  const {width, height} = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: width / 2,
    height: height,
    x: 0,
    y: 0,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
    },
  });
  
  // and load the index.html of the app.
  mainWindow.loadFile(path.join('src', 'renderer', 'start_page.html'));

  // Open the DevTools.
  if(CONSTANTS.OPEN_DEV_TOOLS) {
    mainWindow.webContents.openDevTools()
  }

  const page = mainWindow.webContents;

  page.once('did-frame-finish-load', () => {
    console.log('checking for updates');
    appUpdater();
  });
  mainWindow.show();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
