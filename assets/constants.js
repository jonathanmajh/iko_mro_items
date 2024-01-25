//for global constants. used for debugging

const CONSTANTS = Object.freeze({
    ENV: true ? 'prod.manage.prod' : 'test.manage.test', //set true to use production environment and set false for test environment.
    OPEN_DEV_TOOLS: true, //set true to open dev tools on application launch
});

module.exports = CONSTANTS;