// for global constants. used for debugging

const devMode = false; //set to true for testing. Remember to set it back to false when committing!

/**
 * Application constants
 * @property {boolean} OPEN_DEV_TOOLS - if true, open dev tools on application launch
 * @property {string} ENV - the current maximo environment (e.g. 'prod.manage.prod')
 * @property {Map<string, string>} REPLACEMENTS - to replace commonly confused illegal characters with their legal counterparts in item search
 * @property {Object} FIREBASECONFIG - firestore login info
 * @property {string} FIRESTORE_EVENT_STARTAPP - string representing application startup event (firestore)
 * @property {string} FIRESTORE_EVENT_SEARCH - string representing application item search event (firestore)
 * @property {string} FIRESTORE_EVENT_ADDTOINVENTORY - string representing application adding item to user storeroom event (firestore)
 * @property {string} FIRESTORE_EVENT_REQUESTITEM - string represention application requesting new item to corporate event (firestore)
 */
const CONSTANTS = Object.freeze({
  /** if true, open dev tools on application launch */
  OPEN_DEV_TOOLS: devMode,
  /** the current maximo environment (e.g. 'prod.manage.prod') */
  ENV: devMode ? 'test.manage.test' : 'prod.manage.prod', // set false to use production environment and set true for test environments.
  /** to replace commonly confused illegal characters with their legal counterparts in item search */
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
  /** firestore login info */
  FIREBASECONFIG: {
    apiKey: 'AIzaSyArfJMEQvf1K2HEhlBixj-6CA_DqNC04bs',
    authDomain: 'iko-reliability.firebaseapp.com',
    projectId: 'iko-reliability',
    storageBucket: 'iko-reliability.appspot.com',
    messagingSenderId: '36956740284',
    appId: '1:36956740284:web:561e9a73a0f3f4b08fceb9',
    measurementId: 'G-112KCDJT5G',
  },
  /** string representing application startup event (firestore) */
  FIRESTORE_EVENT_STARTAPP: 'Start App',
  /** string representing application item search event (firestore) */
  FIRESTORE_EVENT_SEARCH: 'Search Item',
  /** string representing application add item to storeroom event (firestore) */
  FIRESTORE_EVENT_ADDTOINVENTORY: 'Add to Inventory',
  /** string representing application request new item event (firestore) */
  FIRESTORE_EVENT_REQUESTITEM: 'Request Item'
});

module.exports = CONSTANTS;
