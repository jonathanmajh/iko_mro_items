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
});

module.exports = CONSTANTS;
