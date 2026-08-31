// Global constants and runtime configuration.

// Environment selection is controlled by environment variables, with
// production as the safe default. Set these (e.g. in your shell or Forge
// config) to run against non-production environments:
//   MAXIMO_ENV=mas.manage.uat.ikona-np.naviam.app
//   OPEN_DEV_TOOLS=true
//   FIREBASE_API_KEY=<your key>

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
    authDomain: 'iko-reliability.firebaseapp.com',
    projectId: 'iko-reliability',
    storageBucket: 'iko-reliability.appspot.com',
    messagingSenderId: '36956740284',
    appId: '1:36956740284:web:561e9a73a0f3f4b08fceb9',
    measurementId: 'G-112KCDJT5G',
  }),
  FIRESTORE_EVENT_STARTAPP: 'Start App',
  FIRESTORE_EVENT_SEARCH: 'Search Item',
  FIRESTORE_EVENT_ADDTOINVENTORY: 'Add to Inventory',
  FIRESTORE_EVENT_REQUESTITEM: 'Request Item',
});

module.exports = CONSTANTS;
