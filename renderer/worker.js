const Validate = require('../assets/validators')
const ExcelReader = require('../assets/spreadsheet')

onmessage = function (e) {
    console.log('recieved message from boss:')
    console.log(e);
    if (e.data[0] === 'validSingle') {
        console.log(e.data[1]);
        let valid = new Validate;
        let result = valid.validateSingle(e.data[1]);
        console.log(result);
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
        let updateType = e.data[1]
        let excel = new ExcelReader(e.data[2])
        if (updateType === 'manufacturer') {
            let data = excel.getManufactures()
            console.log(data)
        } else if (updateType === 'abbreviations') {
            let data = excel.getAbbreviations()
            console.log(data)
        }
    } else {
        console.log('unimplimented work');
    }
}


console.log('worker thread started')