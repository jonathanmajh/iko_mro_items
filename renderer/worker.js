const Validate = require('../assets/validators')
const ExcelReader = require('../assets/spreadsheet')
const Database = require('../assets/database')
const Maximo = require('../assets/maximo')

onmessage = function (e) {
    console.log('recieved message from boss:')
    console.log(e);
    if (e.data[0] === 'validSingle') {
        console.log(e.data[1]);
        let valid = new Validate;
        let result = valid.validateSingle(e.data[1]);
        console.log(`result of valid.validateSingle: ${result}`);
        postMessage(['result', result]);
        postMessage('test message');
    } else if (e.data[0] === 'validTriple') {
        let valid = new Validate;
        let result = valid.validateTriple(e.data[1]);
        console.log(result);
        postMessage(['result', result]);
    } else if (e.data[0] === 'validBatch') {
        let valid = new Validate;
        let result = valid.validateBatch(e.data[1]);
        console.log(result);
        postMessage(['result', result]);
    } else if (e.data[0] === 'update') {
        const updateType = e.data[1];
        const excel = new ExcelReader(e.data[2]);
        const db = new Database();
        if (updateType === 'manufacturer') {
            let data = excel.getManufactures();
            console.log(data);
            db.populateManufacturers(data);
        } else if (updateType === 'abbreviations') {
            let data = excel.getAbbreviations();
            console.log(data);
            db.populateAbbreviations(data);
        }
    } else if (e.data[0] === 'createDatabase') {
        const db = new Database();
        db.createAbbreviations();
        db.createManufacturers();
        postMessage(['result', 'done']);
    } else if (e.data[0] === 'findRelated') {
        const maximo = new Maximo();
        maximo.findRelated(e.data[1])
    } else {
        console.log('unimplimented work');
    }
}


console.log('worker thread started')