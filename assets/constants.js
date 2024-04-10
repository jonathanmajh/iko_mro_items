// for global constants. used for debugging

const CONSTANTS = Object.freeze({
  OPEN_DEV_TOOLS: false, // set true to open dev tools on application launch
  ENV: this.OPEN_DEV_TOOLS ? 'development.manage.development' : 'prod.manage.prod', // set true to use production environment and set false for test environment.
  REPLACEMENTS: Object.freeze({ // for replacing commonly confused illegal characters with their legal counterparts
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
});

module.exports = CONSTANTS;
