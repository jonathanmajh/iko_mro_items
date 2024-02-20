"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appUpdater = void 0;
const os_1 = __importDefault(require("os"));
const electron_1 = require("electron");
const version = electron_1.app.getVersion();
const platform = os_1.default.platform() + '_' + os_1.default.arch(); // usually returns darwin_64
const updaterFeedURL = 'https://jonathanmajh-iko-mro-items.onrender.com/update/' + platform + '/' + version;
// replace updaterFeedURL with https://l3gxze.deta.dev
const urlOptions = { url: updaterFeedURL };
function appUpdater() {
    electron_1.autoUpdater.setFeedURL(urlOptions);
    /* Log whats happening
  TODO send autoUpdater events to renderer so that we could console log it in developer tools
  You could alsoe use nslog or other logging to see what's happening */
    electron_1.autoUpdater.on('error', err => { console.log(err); });
    electron_1.autoUpdater.on('checking-for-update', () => { console.log('checking-for-update'); });
    electron_1.autoUpdater.on('update-available', () => {
        console.log('update-available');
    });
    electron_1.autoUpdater.on('update-not-available', () => { console.log('update-not-available'); });
    // Ask the user if update is available
    electron_1.autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        console.log('update-downloaded');
        // Ask user to update the app
        const selected = electron_1.dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Update and Relaunch', 'Later'],
            defaultId: 0,
            message: 'Update Available!',
            detail: `A new version of ${electron_1.app.getName()} has been downloaded\nDo you want to update now?\nUpdate will be automatically installed on next start up.`
        });
        if (selected === 0) {
            electron_1.autoUpdater.quitAndInstall();
        }
    });
    // init for updates
    electron_1.autoUpdater.checkForUpdates();
}
exports.appUpdater = appUpdater;
exports = module.exports = {
    appUpdater
};
