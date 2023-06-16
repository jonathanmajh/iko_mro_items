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
const { debug, error } = require('console');

onmessage = function (e) {
    let valid;
    let maximo;
    let result;
    switch (e.data[0]) {
        case 'validSingle':
            valid = new Validate();
            valid.validateSingle(e.data[1]).then((result) => {
                postMessage(['result', result]);
            });
            break;
        case 'validBatch':
            valid = new Validate();
            valid.validateBatch(e.data[1]).then((result) => {
                postMessage(['result', result]);
            });
            break;
        case 'update':
            update(e);
            break;
        case 'createDatabase':
            const db = new Database();
            db.createAbbreviations();
            db.createManufacturers();
            postMessage(['result', 'done']);
            break;
        case 'findRelated':
            maximo = new Database();
            maximo.findRelated(e.data[1], e.data[2], true);
            break;
        case 'interactive':
            interactive(e);
            break;
        case 'writeDesc':
            writeDesc(e);
            break;
        case 'writeNum':
            writeItemNum(e.data[1]);
            break;
        case 'checkItemCache':
            checkItemCache(e.data[1]);
            break;
        case 'processObservationList':
            const excel = new Spreadsheet(e.data[1][0]);
            excel.readObservList(e.data[1][1]);
            break;
        case 'getMaximoObservation':
            maximo = new Maximo();
            maximo.getObservations();
            break;
        case 'compareObservLists':
            compareObservLists(e.data[1], e.data[2], e.data[3]);
            break;
        case 'refreshTranslations':
            refreshTranslations(e.data[1]);
            break;
        case 'batchTranslate':
            batchTranslate(e.data[1]);
            break;
        case 'nonInteractive':
            nonInteractiveSave(e.data[1]);
            break;
        case 'loadItem':
            maximo = new Database();
            result = maximo.loadItem(e.data[1]);
            if (result) {
                postMessage(['result', result]);
            } else {
                postMessage(['error', `${e.data[1]} cannot be found in Maximo`]);
            }
            break;
        case 'translatepms':
            const translate = new AssetTranslate();
            translate.translate(e.data[1]);
            break;
        case 'getCurItemNumber':
            getCurItemNum(e.data[1]);
            break;
        case 'uploadItems':
            e.data[2] ? uploadAllItems(e.data[1],e.data[2]) : uploadAllItems(e.data[1]);
            break;     
        case 'translateItem':
            const trans = new Translation();
            result = trans.contextTranslate(e.data[1], e.data[2], e.data[3]);
            break;
        case 'saveProcessed':
            saveProgress(e.data[1]);
            break;
        case 'checkUser':
            checkUser(e.data[1]);
            break;
        case 'uploadImages':
            uploadImages(e.data[1]);
            break;
        default:
        console.log(`Unimplimented work ${e.data[0]}`);
    }
};

async function saveProgress(params) {
    const db = new Database();
    const data = db.getAllWorkingDesc();
    const excel = new ExcelReader(params[0].filePath);
    let result = await excel.saveNonInteractive(params, data);
    console.log(result);
    postMessage(['saveComplete', Number(params[1]) + 1]);
}

async function getCurItemNum(series) {
    const maximo = new Maximo();
    let num;
    try{
        num = await maximo.getCurItemNumber(series);
        postMessage(['result',1,num]);
    } catch (err){
        postMessage(['debug',err]);
        postMessage(['result',0,'Unable to get number'])
    }
}

function nonInteractiveSave(params) {
    try {
        if (params[0]) {
            // find related
            const maximo = new Database();
            let related = maximo.findRelated(params[2], false);
            for (let value of Object.entries(related[0])) {
                if (value[1][0]) {
                    params[0] = value[1][0];
                    break;
                }
                params[0] = null;
            }
            // gets first element in related object scores
            // technically this is bad practise since object order might not be guarenteed
            // https://stackoverflow.com/questions/983267/how-to-access-the-first-property-of-a-javascript-object
        }
        if (params[1]) {
            // translate
            const trans = new Translation();
            params[1] = trans.contextTranslate(params[2], params[3], 'return');
        }
        const db = new Database();
        db.saveDescriptionAnalysis({ related: params[0], translate: params[1] }, params[5]);
        // number of rows should be shown and that should be used to determine when to save / finsih
        // also need stop / cancel button
    } finally { postMessage(['nextrow', Number(params[5]) + 1]); }
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
        jobTask: { changes: newJobTasks, delete: removeJobTasks },
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

async function checkUser(credentials = {}) {
    postMessage(['debug', `Checking Maximo Login`]);
    const maximo = new Maximo();
    const validUser = await maximo.checkLogin(credentials?.userid, credentials?.password);
    if (validUser) {
        postMessage(['result', true]);
    } else {
        postMessage(['result', false]);
    }
}

async function checkItemCache(version) {
    // check internal cache of item information and update with new items in maximo
    postMessage(['debug', `Loading Item Module`]);
    const maximo = new Maximo();
    postMessage(['debug', `0%: Checking Program Version`]);

    const db = new Database();
    const shareDB = new SharedDatabase();
    if (!(await shareDB.checkVersion(version))) {
        db.createTables();
        const filePath = path.join(
            require('path').resolve(__dirname).replace('renderer', 'assets'),
            'item_information.xlsx'
        );
        const excel = new ExcelReader(filePath);
        postMessage(['debug', `10%: Loading Item cache data from file`]);
        db.clearItemCache();
        let data = await excel.getItemCache();
        postMessage(['debug', `20%: Saving data to Item cache`]);
        db.saveItemCache(data[0]);
        postMessage(['debug', `30%: Loading Manufacturer cache data from file`]);
        let manu = await excel.getManufactures();
        let abbr = await excel.getAbbreviations();
        postMessage(['debug', `40%: Saving data to Manufacturer cache`]);
        db.populateAbbr(abbr);
        db.saveManufacturers(manu);
    }
    curVersion = db.getVersion('maximo');
    curVersion = curVersion[0].changed_date;
    postMessage(['debug', `50%: Getting items with changes after: ${curVersion} from Maximo`]);

    let newItems = await maximo.getNewItems(curVersion);
    if (newItems) {
        postMessage(['debug', '65%: Saving maximo data to item cache']);
        db.saveItemCache(newItems[0]);
    }

    curVersion = db.getVersion('manufacturer');
    curVersion = curVersion[0].changed_date;
    postMessage(['debug', `80%: Getting Manufacturer with changes after: ${curVersion} from Maximo`]);
    newItems = await maximo.getNewManufacturers(curVersion);
    if (newItems) {
        postMessage(['debug', '90%: Saving maximo data to Manufacturer cache']);
        db.saveManufacturers(newItems[0]);
    }

    postMessage(['result', 'done']);
}

async function uploadAllItems(items,doUpdate = false){
    const maximo = new Maximo();
    let count = 1;
    let newNums = [];
    let num,numFails=0,numSuccesses=0;
    
    for(const item of items){
        let needsNewNum = false;
        try{
            if(item===''){
                count++;
                continue;
            }
            if(item.itemnumber === 0 || item.itemnumber.length != 7){
                needsNewNum = true;
                num = await maximo.getCurItemNumber(item.series);
                num++;
                newNums.push([num,count]);
                item.itemnumber = num;
            }
        } catch (err){
            if(needsNewNum) newNums.pop();
            numFails++;
            console.log(err + ", Item Upload Failed");
            if(doUpdate) postMessage(['update','fail',count])
            postMessage(['fail',err]);
            continue;
        }

        try{
            let result = await maximo.uploadToMaximo(item);
            if(!result){
                if(doUpdate) postMessage(['update','fail',count]);
                throw new Error('Upload Failed');
            } else {
                if(doUpdate) postMessage(['update','success',count]);
                postMessage(['debug',`Upload of ${item.description} succeeded`]);
                console.log("Upload of " + item.description + " success");
                numSuccesses++;
            }
        } catch (err){
            if(needsNewNum) newNums.pop();
            numFails++;
            postMessage(['fail',`Failed upload of ${item.description}`]);
            console.error(`Failed upload of \"${item.description}\", ${err}`);
        }
        //console.log(count);
        count++;
    }
    postMessage(['result',newNums,numFails,numSuccesses]);
}

async function uploadImages(images){
    try{
        const maximo = new Maximo();
        for(let i = 0; i < images.length; i++){
            let img = images[i];
            let result = await maximo.uploadImageToMaximo(img);
            //console.log(result);
            postMessage(['callback',result,i]);
            postMessage([`${(result=='success'?'debug':'fail')}`,`${img.name} upload ${(result=='success' ? 'success' : 'fail')}`]);
        }
        postMessage(['result','done']);
    }
    catch(err){
        console.log(err);
        postMessage(['result','total failure',err]);
    }
}


