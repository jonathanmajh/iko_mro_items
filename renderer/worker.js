const Validate = require('../assets/validators');
const ExcelReader = require('../assets/spreadsheet');
const Database = require('../assets/indexDB');
const Maximo = require('../assets/maximo');
const path = require('path');

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
    } else if (e.data[0] === 'checkItemCache') {
        checkItemCache()
    } else {
        console.log('unimplimented work');
    }
}

async function checkItemCache() {
    postMessage(['debug', `0%: Checking item cache data`]);
    const filePath = path.join(require('path').resolve(__dirname).replace('renderer', 'assets'), 'item_information.xlsx');
    const excel = new ExcelReader(filePath);
    const db = new Database();
    let xlVersion = excel.getVersion();
    let curVersion = await db.getVersion('itemCache');
    curVersion = curVersion[0]?.version;
    if (!(curVersion === xlVersion)) {
        postMessage(['debug', `10%: Loading item cache data from file`]);
        await db.db.itemCache.clear().then(function () {
            console.log('finished clearing')
        }).catch(function (err) {
            console.log(err.stack);
            console.log(err)
        });
        let data = excel.getItemCache();
        curVersion = data[1]
        postMessage(['debug', `25%: Saving data to item cache`]);
        await db.saveItemCache(data[0]);
        await db.saveVersion('itemCache', curVersion);
    }
    curVersion = await db.getVersion('maximoItemCache')
    curVersion = curVersion[0]?.version ?? xlVersion;
    postMessage(['debug', `50%: Getting items with changes after: ${curVersion} from Maximo`]);
    const maximo = new Maximo()
    let newItems = await maximo.getNewItems(curVersion)
    postMessage(['debug', '75%: Saving maximo data to item cache']);
    await db.saveItemCache(newItems[0]);
    await db.saveVersion('maximoItemCache', newItems[1]);
    postMessage(['result', 'done'])
}