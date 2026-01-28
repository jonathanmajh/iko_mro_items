// for global constants. used for debugging

const devMode = false; //set to true for testing. Remember to set it back to false when committing!

const CONSTANTS = Object.freeze({
  OPEN_DEV_TOOLS: true, // set true to open dev tools on application launch
  ENV: devMode ? 'test2.manage.test2' : 'prod.manage.prod', // set false to use production environment and set true for test environments.
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
  FIREBASECONFIG: {
    apiKey: 'AIzaSyArfJMEQvf1K2HEhlBixj-6CA_DqNC04bs',
    authDomain: 'iko-reliability.firebaseapp.com',
    projectId: 'iko-reliability',
    storageBucket: 'iko-reliability.appspot.com',
    messagingSenderId: '36956740284',
    appId: '1:36956740284:web:561e9a73a0f3f4b08fceb9',
    measurementId: 'G-112KCDJT5G',
  },
  FIRESTORE_EVENT_STARTAPP: 'Start App',
  FIRESTORE_EVENT_SEARCH: 'Search Item',
  FIRESTORE_EVENT_ADDTOINVENTORY: 'Add to Inventory',
  FIRESTORE_EVENT_REQUESTITEM: 'Request Item',
});

module.exports = CONSTANTS;
