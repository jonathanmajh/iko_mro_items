const os = require('os');
const { app, autoUpdater, dialog } = require('electron');
const version = app.getVersion();
const platform = os.platform() + '_' + os.arch();  // usually returns darwin_64

const updaterFeedURL = 'https://jonathanmajh-iko-mro-items.onrender.com/update/' + platform + '/' + version;
// replace updaterFeedURL with https://l3gxze.deta.dev

function appUpdater() {
	autoUpdater.setFeedURL(updaterFeedURL);
	/* Log whats happening
	TODO send autoUpdater events to renderer so that we could console log it in developer tools
	You could alsoe use nslog or other logging to see what's happening */
	autoUpdater.on('error', err => console.log(err));
	autoUpdater.on('checking-for-update', () => console.log('checking-for-update'));
	autoUpdater.on('update-available', () => {
		console.log('update-available');
	});
	autoUpdater.on('update-not-available', () => console.log('update-not-available'));

	// Ask the user if update is available
	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
		console.log('update-downloaded');
		// Ask user to update the app
		const selected = dialog.showMessageBoxSync({
			type: 'question',
			buttons: ['Update and Relaunch', 'Later'],
			defaultId: 0,
			message: 'Update Available!',
			detail: `A new version of ${app.getName()} has been downloaded\nDo you want to update now?\nUpdate will be automatically installed on next start up.`,
		});
		if (selected === 0) {
			autoUpdater.quitAndInstall();
		}
	});
	// init for updates
	autoUpdater.checkForUpdates();
}

exports = module.exports = {
	appUpdater
};