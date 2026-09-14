// Global constants and runtime configuration.

// Environment selection is controlled by environment variables, with
// production as the safe default. Set these (e.g. in your shell or Forge
// config) to run against non-production environments:
//   MAXIMO_ENV=mas.manage.uat.ikona-np.naviam.app
//   OPEN_DEV_TOOLS=true
//   FIREBASE_API_KEY=<your key>
//
// For local dev, copy `.env.example` to `.env` (gitignored) instead of
// exporting variables in every shell. `.env.local` (also gitignored)
// optionally overrides `.env` per machine.

// Load dev .env files BEFORE reading process.env below. dotenv never
// overrides real environment variables, so precedence is:
// real env > .env.local > .env > built-in defaults. Paths resolve relative
// to this file, i.e. the repo root in dev; inside the packaged app.asar no
// such files exist, so this is a silent no-op in production.
try {
  const path = require('path');
  const dotenv = require('dotenv');
  const root = path.join(__dirname, '..');
  // NOTE: dotenv never overwrites existing variables, so `.env.local` is
  // loaded FIRST — that ordering is what yields the documented precedence.
  for (const file of ['.env.local', '.env']) {
    const result = dotenv.config({path: path.join(root, file), quiet: true});
    if (result.error && result.error.code !== 'ENOENT') {
      console.warn(`[constants] ignoring malformed ${file}: ${result.error.message}`);
    }
  }
} catch (_e) {
  // dotenv unavailable (e.g. stripped from a custom bundle) — fall back to
  // plain environment variables and built-in defaults.
}

const MAXIMO_ENV = process.env.MAXIMO_ENV || 'prod.manage.prod.iko.max-it-eam.com';
const OPEN_DEV_TOOLS = process.env.OPEN_DEV_TOOLS === 'true';

const CONSTANTS = Object.freeze({
  OPEN_DEV_TOOLS, // set true to open dev tools on application launch
  ENV: MAXIMO_ENV,
  REPLACEMENTS: Object.freeze({
    // single quote
    '`': '\'',
    '´': '\'',
    '‘': '\'',
    '’': '\'',
    // double quote
    '“': '"',
    '”': '"',
    // hyphen
    '—': '-',
    '–': '-',
    '−': '-',
  }),
  FIREBASECONFIG: Object.freeze({
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'iko-reliability.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'iko-reliability',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'iko-reliability.appspot.com',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '36956740284',
    appId: process.env.FIREBASE_APP_ID || '1:36956740284:web:561e9a73a0f3f4b08fceb9',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-112KCDJT5G',
  }),
  FIRESTORE_EVENT_STARTAPP: 'Start App',
  FIRESTORE_EVENT_SEARCH: 'Search Item',
  FIRESTORE_EVENT_ADDTOINVENTORY: 'Add to Inventory',
  FIRESTORE_EVENT_REQUESTITEM: 'Request Item',
});

module.exports = CONSTANTS;
