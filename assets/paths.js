// Centralized resolution of OS user-data paths.
//
// The application stores its local databases in a versioned per-user folder:
//   Windows: %APPDATA%\EAM Spare Parts
//   macOS:   ~/Library/Preferences/EAM Spare Parts
//   Linux:   ~/.local/share/EAM Spare Parts
//
// All modules that open local SQLite files should use these helpers instead of
// resolving paths themselves.

const path = require('path');

function appDataDir() {
  if (process.platform === 'win32') {
    return process.env.APPDATA || path.join(process.env.HOME || '', 'AppData', 'Roaming');
  }
  if (process.platform === 'darwin') {
    return process.env.HOME ? path.join(process.env.HOME, 'Library', 'Preferences') : '';
  }
  return process.env.HOME ? path.join(process.env.HOME, '.local', 'share') : '';
}

function appDir() {
  return path.join(appDataDir(), 'EAM Spare Parts');
}

module.exports = {
  appDataDir,
  appDir,
  programDb: () => path.join(appDir(), 'program.db'),
  obserlistDb: () => path.join(appDir(), 'obserlist.db'),
  translistDb: () => path.join(appDir(), 'translist.db'),
};
