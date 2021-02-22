const Validate = require('../assets/validators')
const ExcelReader = require('../assets/spreadsheet')
const Database = require('../assets/indexDB')
const Maximo = require('../assets/maximo')

onmessage = function (e) {
    console.log(`recieved message from boss: ${e}`)
    if (e.data[0] === 'validSingle') {
        let valid = new Validate;
        valid.validateSingle(e.data[1]).then(
            result => {
                console.log(`valid.validateSingle: ${result}`);
                postMessage(['result', result]);
            }
        );       
    } else if (e.data[0] === 'validTriple') {
        let valid = new Validate;
        valid.validateTriple(e.data[1]).then(
            result => {
                console.log(`valid.validateTriple: ${result}`);
                postMessage(['result', result]);
            }
        );
    } else if (e.data[0] === 'validBatch') {
        let valid = new Validate;
        valid.validateBatch(e.data[1]).then(
            result => {
                console.log(`valid.validateBatch: ${result}`);
                postMessage(['result', result]);
            }
        );
    } else if (e.data[0] === 'update') {
        const updateType = e.data[1];
        const excel = new ExcelReader(e.data[2]);
        const db = new Database();
        if (updateType === 'manufacturer') {
            let data = excel.getManufactures();
            db.populateManufacturers(data);
        } else if (updateType === 'abbreviations') {
            let data = excel.getAbbreviations();
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
    } else if (e.data[0] === 'interactive') {
        const excel = new ExcelReader(e.data[1][0]);
        let data = excel.getDescriptions(e.data[2][0], e.data[2][1].split(','), parseInt(e.data[2][2]));
        const db = new Database();
        data = db.saveDescription(data).then(() => {
            postMessage(['result', parseInt(e.data[2][2])]);
        });
    } else if (e.data[0] === 'writeDesc') {
        const excel = new ExcelReader(e.data[1][0]);
        let result = excel.saveDescription(e.data[1]);
        result.then((result => {
            if (result) {
                postMessage(['result', result]);
            }
        }))
    } else if (e.data[0] === 'writeNum') {
        const excel = new ExcelReader(e.data[1][0]);
        let result = excel.saveNumber(e.data[1]);
        result.then((result => {
            if (result) {
                postMessage(['result', result]);
            }
        }))
    } else {
        console.log('unimplimented work');
    }
}