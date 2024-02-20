"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Modules to control application life and create native browser window
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const autoupdater_js_1 = require("./misc/autoupdater.js");
const constants_js_1 = __importDefault(require("./misc/constants.js"));
require('electron-reload')(__dirname);
let mainWindow;
let settingWindow;
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
// Write eml file
electron_1.ipcMain.on('write-file', (event, emailData) => {
    const pathToFile = path_1.default.resolve(__dirname, 'downloadedFile.eml');
    fs_1.default.writeFile(pathToFile, emailData, (err) => {
        if (err) {
            console.error(`Error writing file: ${err}`);
        }
        else {
            electron_1.shell.openPath(pathToFile);
            // .then(() => {
            //   sleep(2000).then(() => {
            //   // Delete the file after opening
            //     fs.unlink(pathToFile, (err: any) => {
            //       if (err) {
            //         console.error(`Error deleting file: ${err}`);
            //       } else {
            //         console.log('File deleted successfully');
            //       }
            //     });
            //   },
            //   )
            //       .catch((err: any) => {
            //         console.error(`Error opening file: ${err}`);
            //       });
            // });
        }
    });
});
electron_1.ipcMain.on('openSettings', (event, arg) => {
    settingWindow = new electron_1.BrowserWindow({
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
    settingWindow.loadFile(path_1.default.join('src', 'renderer', 'setting.html'));
    settingWindow.show();
    settingWindow.on('closed', () => {
        mainWindow.show();
        settingWindow = null;
    });
    if (constants_js_1.default.OPEN_DEV_TOOLS) {
        settingWindow.webContents.openDevTools();
    }
});
electron_1.ipcMain.on('getVersion', (event, arg) => {
    event.returnValue = electron_1.app.getVersion();
});
electron_1.ipcMain.handle('select-to-be-translated', (event, arg) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield electron_1.dialog.showOpenDialog(mainWindow, {
        title: 'Select Spreadsheet',
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb'] },
        ],
        properties: [
            'openFile',
        ],
    });
    return result;
}));
electron_1.ipcMain.handle('select-excel-file', (event, arg) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield electron_1.dialog.showOpenDialog(mainWindow, {
        title: 'Select Excel Spreadsheet',
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb'] },
        ],
        properties: [
            'openFile',
        ],
    });
    return result;
}));
electron_1.ipcMain.handle('select-translations', (event, arg) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield electron_1.dialog.showOpenDialog(mainWindow, {
        title: 'Select Translation Definition Spreadsheet',
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb'] },
        ],
        properties: [
            'openFile',
        ],
    });
    return result;
}));
electron_1.ipcMain.on('getPath', (event, arg) => {
    event.returnValue = electron_1.app.getPath('userData');
});
electron_1.ipcMain.on('loading', (event, arg) => {
    mainWindow.loadFile(path_1.default.join('src', 'renderer', 'item_main.html'));
});
electron_1.ipcMain.on('start_item_module', (event, arg) => {
    mainWindow.loadFile(path_1.default.join('src', 'renderer', 'item_loading.html'));
});
electron_1.ipcMain.on('start_observation_template', (event, arg) => {
    mainWindow.loadFile(path_1.default.join('src', 'renderer', 'observation_template.html'));
});
electron_1.ipcMain.on('start_item_translate', (event, arg) => {
    mainWindow.loadFile(path_1.default.join('src', 'renderer', 'item_translation.html'));
});
electron_1.ipcMain.on('start_asset_translate', (event, arg) => {
    mainWindow.loadFile(path_1.default.join('src', 'renderer', 'asset_translation.html'));
});
function createWindow() {
    // Create the browser window.
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new electron_1.BrowserWindow({
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
    mainWindow.loadFile(path_1.default.join('src', 'renderer', 'start_page.html'));
    // Open the DevTools.
    if (constants_js_1.default.OPEN_DEV_TOOLS) {
        mainWindow.webContents.openDevTools();
    }
    const page = mainWindow.webContents;
    page.once('did-frame-finish-load', () => {
        console.log('checking for updates');
        (0, autoupdater_js_1.appUpdater)();
    });
    mainWindow.show();
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
