const Validate = require('../assets/validators');
const ExcelReader = require('../assets/spreadsheet');
const Spreadsheet = require('../assets/exceljs');
const Database = require('../assets/indexDB');
const SharedDatabase = require('../assets/sharedDB');
const Maximo = require('../assets/maximo');
const AssetTranslate = require('../assets/asset_translation/asset_translation_main.js');
const ObservationDatabase = require('../assets/better-sqlite');
const TranslationDatabase = require('../assets/item_translation/item-translation-sqlite');
const path = require('path');
const Translation = require('../assets/item_translation/item-translation');
const fs = require('fs');

onmessage = function (e) {
    if (e.data[0] === 'validSingle') {
        let valid = new Validate();
        valid.validateSingle(e.data[1]).then(
            result => {
                postMessage(['result', result]);
            }
        );
    } else if (e.data[0] === 'validBatch') {
        let valid = new Validate();
        valid.validateBatch(e.data[1]).then(
            result => {
                postMessage(['result', result]);
            }
        );
    } else if (e.data[0] === 'update') {
        update(e);
    } else if (e.data[0] === 'createDatabase') {
        const db = new Database();
        db.createAbbreviations();
        db.createManufacturers();
        postMessage(['result', 'done']);
    } else if (e.data[0] === 'findRelated') {
        const maximo = new Database();
        maximo.findRelated(e.data[1], true);
    } else if (e.data[0] === 'interactive') {
        interactive(e);
    } else if (e.data[0] === 'writeDesc') {
        writeDesc(e);
    } else if (e.data[0] === 'writeNum') {
        writeItemNum(e.data[1]);
    } else if (e.data[0] === 'checkItemCache') {
        checkItemCache(e.data[1]);
    } else if (e.data[0] === 'processObservationList') {
        const excel = new Spreadsheet(e.data[1][0]);
        excel.readObservList(e.data[1][1]);
    } else if (e.data[0] === 'getMaximoObservation') {
        const maximo = new Maximo();
        maximo.getObservations();
    } else if (e.data[0] === 'compareObservLists') {
        compareObservLists(e.data[1], e.data[2], e.data[3]);
    } else if (e.data[0] === 'refreshTranslations') {
        refreshTranslations(e.data[1]);
    } else if (e.data[0] === 'batchTranslate') {
        batchTranslate(e.data[1]);
    } else if (e.data[0] === 'nonInteractive') {
        nonInteractiveSave(e.data[1]);
    } else if (e.data[0] === 'loadItem') {
        const maximo = new Database();
        let result = maximo.loadItem(e.data[1]);
        if (result) {
            postMessage(['result', result]);
        } else {
            postMessage(['error', `${itemnum} cannot be found in Maximo`]);
        }
    } else if (e.data[0] === 'translatepms') {
        const translate = new AssetTranslate();
        translate.translate(e.data[1]);
    } else if (e.data[0] === 'getNextItemNumber') {
        const maximo = new Maximo();
        maximo.getNextItemNumber();
    } else if (e.data[0] === 'translateItem') {
        const trans = new Translation();
        result = trans.contextTranslate(e.data[1], e.data[2], e.data[3]);
    } else {
        console.log(`Unimplimented work ${e.data[0]}`);
    }
};

async function nonInteractiveSave(params) {
    if (params[0]) { // find related
        const maximo = new Database();
        let related = maximo.findRelated(params[2], false);
        for (let value of Object.entries(related[0])) {
            if (value[1][0]) {
                params[0] = value[1][0];
                break;
            }
        }
        // gets first element in related object scores
        // technically this is bad practise since object order might not be guarenteed 
        // https://stackoverflow.com/questions/983267/how-to-access-the-first-property-of-a-javascript-object
    }
    if (params[1]) { // translate
        const trans = new Translation();
        params[1] = trans.contextTranslate(params[2], params[3], 'return');
    }
    const db = new Database();
    db.saveDescriptionAnalysis({related: params[0], translate: params[1]}, params[5]);
    // number of rows should be shown and that should be used to determine when to save / finsih
    // also need stop / cancel button
    const excel = new ExcelReader(params[4].filePath);
    let result = await excel.saveNonInteractive(params);
    postMessage(['nextrow', Number(params[5]) + 1]);
}

//depre
async function batchTranslate(params) {
    // translate description in file to all available languagues
    const excel = new Spreadsheet(params.filePath);
    const descs = await excel.getDescriptions(params);
    const trans = new Translation();
    const db = new TranslationDatabase();
    const langs = db.getLanguages();
    let translated;
    let result;
    let missing = [];
    let allTranslated = [];
    for (const desc of descs) {
        translated = desc;
        for (const lang of langs) {
            result = trans.translate({ lang: lang, description: desc.description });
            translated[lang] = result.description;
            missing = missing.concat(result.missing);
        }
        allTranslated.push(translated);
    }
    console.log(allTranslated);
    console.log(missing);
    fs.copyFileSync(params.filePath, `${params.filePath}.backup`);
    const writeExcel = new Spreadsheet(params.filePath);
    writeExcel.saveTranslations({ langs: langs, item: allTranslated, missing: missing });
}

async function interactive(e) {
    const excel = new ExcelReader(e.data[1].filePath);
    let data = await excel.getDescriptions(e.data[1]);
    const db = new Database();
    let dataSaved = db.saveDescription(data);
    postMessage(['result', parseInt(e.data[1].startRow), dataSaved, data.length]);
}

async function writeDesc(e) {
    const excel = new ExcelReader(e.data[1][0].filePath);
    let result = await excel.saveDescription(e.data[1]);
    if (result) {
        postMessage(['result', result]);
    } else {
        //fail message
    }
}

async function update(e) {
    const updateType = e.data[1];
    const excel = new ExcelReader(e.data[2]);
    const db = new Database();
    if (updateType === 'manufacturer') {
        let data = await excel.getManufactures();
        db.populateManufacturers(data);
    } else if (updateType === 'abbreviations') {
        let data = await excel.getAbbreviations();
        db.populateAbbreviations(data);
    }
}

async function refreshTranslations(filePath) {
    // load updated translation list from excel file
    const excel = new Spreadsheet(filePath);
    const data = await excel.getTranslations();
    const db = new TranslationDatabase();
    const result = db.refreshData(data);
    postMessage(['result', result]);
}


async function compareObservLists(data, savePath, jobTaskPath) {
    const sqlite = new ObservationDatabase();
    // compare condition domain definition
    let removeOldMeters = [];
    for (const meter of data[0]) {
        result = sqlite.compareDomainDefinition(meter.list_id, meter.inspect, 1);
        if (!result) {
            removeOldMeters.push(meter.list_id);
        }
    }
    const newMeters = sqlite.getNewDomainDefinitions();
    // compare condition domain values
    let removeOldObservations = [];
    for (const observation of data[1]) {
        result = sqlite.compareDomainValues(observation.search_str, observation.observation);
        if (!result) {
            removeOldObservations.push(observation.search_str.replace('~', ':'));
        }
    }
    const newObservations = sqlite.getNewDomainValues();
    //compare data in meter table
    const maximo = new Maximo();
    data = await maximo.getMeters();
    let removeOldMaximoMeters = [];
    for (const meter of data) {
        result = sqlite.compareDomainDefinition(meter.list_id, meter.inspect, 2);
        if (!result) {
            removeOldMaximoMeters.push(meter.list_id);
        }
    }
    const newMaximoMeters = sqlite.getNewMaximoMeters();
    const excel = new Spreadsheet(jobTaskPath);
    data = await excel.getJobTasks();
    sqlite.saveJobTasks(data);
    sqlite.compareJobTasks();

    const newJobTasks = sqlite.getJobTasks(2);
    const removeJobTasks = sqlite.getJobTasks(0);

    const excelW = new Spreadsheet(savePath);
    await excelW.saveObserListChanges({
        domainDef: { changes: newMeters, delete: removeOldMeters },
        domainVal: { changes: newObservations, delete: removeOldObservations },
        meter: { changes: newMaximoMeters, delete: removeOldMaximoMeters },
        jobTask: { changes: newJobTasks, delete: removeJobTasks }
    });

}

async function writeItemNum(data) {
    const maximo = new Database();
    let item = maximo.loadItem(data[4]);
    if (item) {
        const excel = new ExcelReader(data[0]);
        let result = await excel.saveNumber(data);
        if (result) {
            postMessage(['result', result]);
        }
    } else {
        postMessage(['warning', `${data[4]} cannot be found in Maximo`]);
    }
}

async function checkItemCache(version) {
    // check internal cache of item information and update with new items in maximo
    postMessage(['debug', `Loading Item Module`]);
    postMessage(['debug', `0%: Checking list of Manufacturers & Abbrivations`]);
    const filePath = path.join(require('path').resolve(__dirname).replace('renderer', 'assets'), 'item_information.xlsx');
    const excel = new ExcelReader(filePath);
    const db = new Database();
    const shareDB = new SharedDatabase();
    if(!(await shareDB.checkVersion(version))) {
        db.createTables();
    }
    await db.checkValidDB();
    postMessage(['debug', `33%: Checking list of items in cache`]);
    let xlVersion = await excel.getVersion();
    let curVersion = await db.getVersion('maximoItemCache');
    curVersion = curVersion[0]?.changed_date;
    if (curVersion < xlVersion) {
        postMessage(['debug', `40%: Loading item cache data from file`]);
        db.clearItemCache();
        let data = await excel.getItemCache();
        postMessage(['debug', `60%: Saving data to item cache`]);
        db.saveItemCache(data[0]);
    }
    curVersion = db.getVersion('maximoItemCache');
    curVersion = curVersion[0]?.changed_date ?? xlVersion;
    postMessage(['debug', `75%: Getting items with changes after: ${curVersion} from Maximo`]);
    const maximo = new Maximo();
    let newItems = await maximo.getNewItems(curVersion);
    if (newItems) {
        postMessage(['debug', '85%: Saving maximo data to item cache']);
        db.saveItemCache(newItems[0]);
    }
    postMessage(['result', 'done']);
}

