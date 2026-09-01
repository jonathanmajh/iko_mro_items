const os = require('os');
const https = require('https');
const { app, autoUpdater, dialog, shell } = require('electron');
const version = app.getVersion();
const platform = os.platform();  // usually returns darwin_64

const updaterFeedURL = `https://mro-update.vercel.app/update/` + platform + '/' + version;
const githubRepo = 'jonathanmajh/iko_mro_items';
const githubReleaseUrl = `https://api.github.com/repos/${githubRepo}/releases/latest`;

function normalizeVersion(versionString) {
	return String(versionString || '').replace(/^v/i, '').trim();
}

function compareVersions(left, right) {
	const leftParts = normalizeVersion(left).split(/[.-]/).filter(Boolean);
	const rightParts = normalizeVersion(right).split(/[.-]/).filter(Boolean);
	const maxLength = Math.max(leftParts.length, rightParts.length);

	for (let index = 0; index < maxLength; index++) {
		const leftValue = Number(leftParts[index] || 0);
		const rightValue = Number(rightParts[index] || 0);

		if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) {
			const leftText = String(leftParts[index] || '').toLowerCase();
			const rightText = String(rightParts[index] || '').toLowerCase();
			if (leftText !== rightText) {
				return leftText > rightText ? 1 : -1;
			}
			continue;
		}

		if (leftValue !== rightValue) {
			return leftValue > rightValue ? 1 : -1;
		}
	}

	return 0;
}

function getLatestGitHubRelease() {
	return new Promise((resolve, reject) => {
		const request = https.get(githubReleaseUrl, {
			headers: {
				'User-Agent': 'electron-app',
				'Accept': 'application/vnd.github+json',
			},
		}, (response) => {
			let body = '';
			response.on('data', (chunk) => {
				body += chunk;
			});
			response.on('end', () => {
				if (response.statusCode >= 200 && response.statusCode < 300) {
					try {
						resolve(JSON.parse(body));
					} catch (err) {
						reject(err);
					}
				} else {
					reject(new Error(`GitHub API request failed with status ${response.statusCode}: ${body}`));
				}
			});
		});

		request.on('error', reject);
	});
}

async function fallbackToGitHubUpdate() {
	try {
		const release = await getLatestGitHubRelease();
		const latestVersion = normalizeVersion(release.tag_name || release.name || '');
		if (!latestVersion) {
			return;
		}

		if (compareVersions(latestVersion, version) > 0) {
			const selected = dialog.showMessageBoxSync({
				type: 'info',
				buttons: ['Open Release Page', 'Later'],
				defaultId: 0,
				message: 'Update Available!',
				detail: `Version ${latestVersion} is available on GitHub.\nWould you like to open the release page?`,
			});

			if (selected === 0) {
				shell.openExternal(release.html_url || `https://github.com/${githubRepo}/releases/latest`);
			}
		} else {
			console.log('No GitHub update available');
		}
	} catch (err) {
		console.log('GitHub fallback update check failed:', err.message);
	}
}

function appUpdater() {
	// Only enable auto-update on Windows (Squirrel installer)
	if (platform.startsWith('win32')) {
		let fallbackAttempted = false;
		try {
			autoUpdater.setFeedURL(updaterFeedURL);
			/* Log whats happening
			TODO send autoUpdater events to renderer so that we could console log it in developer tools
			You could alsoe use nslog or other logging to see what's happening */
			autoUpdater.on('error', (err) => {
				console.log('autoUpdater error:', err);
				if (!fallbackAttempted) {
					fallbackAttempted = true;
					fallbackToGitHubUpdate();
				}
			});
			autoUpdater.on('checking-for-update', () => console.log('checking-for-update'));
			autoUpdater.on('update-available', () => {
				console.log('update-available');
			});
			autoUpdater.on('update-not-available', () => console.log('update-not-available'));

			// Ask the user if update is available
			autoUpdater.on('update-downloaded', (_event, _releaseNotes, _releaseName) => {
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
		} catch (err) {
			console.log('Auto-updater not available on this platform:', err.message);
		}
	}
}
module.exports = {
	appUpdater
};