// for global constants. used for debugging

const CONSTANTS = Object.freeze({
    ENV: false ? 'prod.manage.prod' : 'development.manage.development', //set true to use production environment and set false for test environment.
    OPEN_DEV_TOOLS: true, //set true to open dev tools on application launch
    REPLACEMENTS: Object.freeze({ //for replacing commonly confused illegal characters with their legal counterparts 
        //single quote
        "`": "\'",
        "´": "\'",
        "‘": "\'",
        "’": "\'",
        //double quote
        "“": '"',
        "”": '"',
        //hyphen
        "—": "-",
        "–": "-",
        "−": "-",
    })
});

module.exports = CONSTANTS;
