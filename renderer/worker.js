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
const CONSTANTS = require('../assets/constants.js');
/**
 * Handles messages from the WorkerHandler
 *
 * @param {Array} e
 */
onmessage = function (e) {
  let valid;
  let maximo;
  let result;
  // decide which function to run based on the first element in the array
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
      maximo.findRelated(e.data[1], e.data[2], true, e.data[3]);
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
      checkItemCache(e.data[1], e.data[2]);
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
      e.data[2] ? uploadAllItems(e.data[1], e.data[2]) : uploadAllItems(e.data[1]);
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
    case 'uploadInventory':
      if(e.data.length > 2){ //only adding to storeroom
        uploadInventory(e.data[1], e.data[2]).then((statuscode) => this.postMessage(['result', statuscode]));
      } else { //other uses
        uploadInventory(e.data[1]);
      }
      break;
    default:
      console.log(`Unimplimented work ${e.data[0]}`);
  }
};

/**
 * upload item to inventory
 * @param {*} item data regarding uploaded item
 * @param {boolean | undefined} [rtrn] optional parameter used to return information on whether adding to inventory was successful
 * @returns {boolean | void} returns the status code if rtrn is true, else returns void
 */
async function uploadInventory(item, rtrn) {
  const maximo = new Maximo();
  const statusCode = await maximo.uploadToInventory(item);
  try{
    if(rtrn) {
      return statusCode;
    }
  } catch (err){
    console.error(err);
  }
}


async function saveProgress(params) {
  const db = new Database();
  const data = db.getAllWorkingDesc();
  const excel = new ExcelReader(params[0].filePath);
  const result = await excel.saveNonInteractive(params, data);
  console.log(result);
  postMessage(['saveComplete', Number(params[1]) + 1]);
}
/**
 * Get the latest item number for the given series (91, 98, 99)
 *
 * @param {string} series
 */
async function getCurItemNum(series) {
  const maximo = new Maximo();
  let num;
  try {
    num = await maximo.getCurItemNumber(series);
    postMessage(['result', 1, num]);
  } catch (err) {
    postMessage(['fail', err]);
    postMessage(['result', 0, 'Unable to get number']);
  }
}

function nonInteractiveSave(params) {
  try {
    if (params[0]) {
      // find related
      const maximo = new Database();
      const related = maximo.findRelated(params[2], false);
      for (const value of Object.entries(related[0])) {
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
  } finally {
    postMessage(['nextrow', Number(params[5]) + 1]);
  }
}

// depre
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
  const allTranslated = [];
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
  const data = await excel.getDescriptions(e.data[1]);
  const db = new Database();
  const dataSaved = db.saveDescription(data);
  postMessage(['result', parseInt(e.data[1].startRow), dataSaved, data.length]);
}

async function writeDesc(e) {
  const excel = new ExcelReader(e.data[1][0].filePath);
  const result = await excel.saveDescription(e.data[1]);
  if (result) {
    postMessage(['result', result]);
  } else {
    // fail message
  }
}

async function update(e) {
  const updateType = e.data[1];
  const excel = new ExcelReader(e.data[2]);
  const db = new Database();
  if (updateType === 'manufacturer') {
    const data = await excel.getManufactures();
    db.populateManufacturers(data);
  } else if (updateType === 'abbreviations') {
    const data = await excel.getAbbreviations();
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
  const removeOldMeters = [];
  for (const meter of data[0]) {
    result = sqlite.compareDomainDefinition(meter.list_id, meter.inspect, 1);
    if (!result) {
      removeOldMeters.push(meter.list_id);
    }
  }
  const newMeters = sqlite.getNewDomainDefinitions();
  // compare condition domain values
  const removeOldObservations = [];
  for (const observation of data[1]) {
    result = sqlite.compareDomainValues(observation.search_str, observation.observation);
    if (!result) {
      removeOldObservations.push(observation.search_str.replace('~', ':'));
    }
  }
  const newObservations = sqlite.getNewDomainValues();
  // compare data in meter table
  const maximo = new Maximo();
  data = await maximo.getMeters();
  const removeOldMaximoMeters = [];
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
  const item = maximo.loadItem(data[4]);
  if (item) {
    const excel = new ExcelReader(data[0]);
    const result = await excel.saveNumber(data);
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
  console.log(`logging in to https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/whoami?lean=1`);
  maximo.checkLogin(credentials?.userid, credentials?.password);
}
/**
 * Check cache of item information
 * Update with new items from Maximo
 * @param {String} version current app version
 */
async function checkItemCache(version, login) {
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
      'item_information.xlsx',
    );
    const excel = new ExcelReader(filePath);
    postMessage(['debug', `10%: Loading cache data from file`]);
    db.clearItemCache();
    const data = await excel.getItemCache();
    postMessage(['debug', `20%: Saving data to cache`]);
    db.saveItemCache(data[0]);
    db.saveInventoryCache(data[2]);
    postMessage(['debug', `30%: Loading Manufacturer cache data from file`]);
    const manu = await excel.getManufactures();
    const abbr = await excel.getAbbreviations();
    postMessage(['debug', `40%: Saving data to Manufacturer cache`]);
    db.populateAbbr(abbr);
    db.saveManufacturers(manu);
  }
  if (!login) postMessage(['result', 'done']);
  let curVersion;
  curVersion = db.getVersion('inventory');
  curVersion = curVersion[0].rowstamp;
  postMessage(['debug', `50%: Getting inventory with changes after: ${curVersion} from Maximo`]);
  const newInventory = await maximo.getNewInventory(curVersion);
  if (newInventory) {
    postMessage(['debug', '55%: Saving maximo data to inventory cache']);
    db.saveInventoryCache(newInventory[0]);
  }

  curVersion = db.getVersion('maximo');
  curVersion = curVersion[0].changed_date;
  postMessage(['debug', `60%: Getting items with changes after: ${curVersion} from Maximo`]);
  let newItems = await maximo.getNewItems(curVersion);
  if (newItems) {
    postMessage(['debug', '70%: Saving maximo data to item cache']);
    db.saveItemCache(newItems[0]);
  }
  const itemNums = new Map();
  newInventory[0].forEach((inventory) => {
    if (!itemNums.has(inventory[0])) {
      itemNums.set(inventory[0], inventory[0]);
    }
  });
  newItems[0].forEach((item) => {
    if (!itemNums.has(item[0])) {
      itemNums.set(item[0], item[0]);
    }
  });
  const processedItems = db.processNewItems(itemNums);
  db.saveItemCache(processedItems);

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
/**
 * Uploads a list of items to Maximo
 *
 * @param {Item[] | string[]} items - Array of items to upload
 * @param {boolean} doUpdate - Whether or not to update item status. Item status is not updated for single item upload, but is updated for batch upload
 * @postmessage list of new item numbers and item upload statistics
 */
async function uploadAllItems(items, doUpdate = false) { // NOTE: the current implementation of this function means that "9S" series numbers aren't supported
  const maximo = new Maximo();
  // row index of the current item in the table (the first row has an index of 1, initializing to 0 because it gets incremented in the loop)
  let rowIndex = 0;
  // newNums is a list of new item numbers and their corresponding row index
  const newNums = [];
  // num is the current item number, numFails is the number of items that failed to upload, numSuccesses is the number of items that successfully uploaded, numStoreroomSuccesses is the number of items that were successfully added to a storeroom
  let num; let numFails = 0; let numSuccesses = 0; let numStoreroomSuccesses = 0;

  for (const item of items) {
    let needsNewNum = false; // by default the item does not need a new item number
    rowIndex++; // for each item increment rowindex
    try {
      // if item is an empty string, it is invalid, therefore skip it
      if (item === '') {
        continue;
      }
      if (item.itemnumber === 0 || item.itemnumber.length != 7) {
        // if the item number is 0 or is not 7 characters long, assign a new item number
        needsNewNum = true;
        // get latest item number
        num = await maximo.getCurItemNumber(item.series);
        // increment it by 1 to get an unused item number
        num++; // since we are incrementing nums, we can't use a 9S series number because it will be a string, not a number
        // push the new item number and the row index to newNums
        newNums.push([num, rowIndex]);
        // set itemnumber property of the item to the new item number
        item.itemnumber = num;
      }
    } catch (err) {
      // if theres an error, remove the new item num from newNums as it wont be used for the failed item.
      if (needsNewNum) newNums.pop();
      numFails++;
      console.log(err + ', Item Upload Failed');
      if (doUpdate) postMessage(['update', 'fail', rowIndex]);
      postMessage(['fail', err]);
      continue;
    }

    try {
      const result = await maximo.uploadToMaximo(item);
      if (!result) {
        if (doUpdate) postMessage(['update', 'fail', rowIndex]);
        throw new Error('Upload Failed');
      } else {
        if (doUpdate) postMessage(['update', 'success', rowIndex]);
        postMessage(['debug', `Upload of ${item.description} succeeded`]);
        console.log('Upload of ' + item.description + ' success');
        numSuccesses++;
      }
    } catch ({ err, message }) {
      if (needsNewNum) newNums.pop();
      numFails++;
      postMessage(['fail', `Failed upload of ${item.description}`]);
      console.error(`Failed upload of \"${item.description}\", ${err}`);
      if (items.length == 1) { // single item upload failed
        switch (message) {
          case '400':
            // invalid item error
            postMessage(['upload-error', message, 'An error occured due to the item\'s format. Please review the item.']);
            break;
          case '401':
            // not logged in error
            postMessage(['upload-error', message, 'Upload rejected as user is not logged in. Please login and try again.']);
            break;
          case '403':
            // not authorized error
            postMessage(['upload-error', message, 'User is not authorized to upload items. Please contact Corporate Reliability.']);
            break;
          case '502':
            // bad gateway error
            postMessage(['upload-error', message, 'Connection error. Please try agian later.']);
            break;
          case '503':
            // service unavailable error
            postMessage(['upload-error', message, 'Something went wrong with the server. Please try agian later.']);
            break;
          default:
            if (message.length == 3 && parseInt(message) >= 400 && parseInt(message) < 600) {
              postMessage(['upload-error', message, `${message} error.`]);
            } else {
              postMessage(['upload-error', 'Unidentified', 'An unidentified error occured']);
            }
        }
        continue;
      }
    }

    // Does inventory upload of the item if any of the inventory fields are filled in
    if (item.storeroomname != '' || item.siteID != '' || item.cataloguenum != '' || item.vendorname != '') {
      try {
        const result = await maximo.uploadToInventory(item);
        // Cases of result are listed in maximo.js
        if (result == 0) {
          throw new Error('Unable to upload');
        } else if (result == 1) {
          postMessage(['debug', `Inventory upload of ${item.description} succeeded`]);
          console.log('Adding to ' + item.storeroomname + ' success');
          numStoreroomSuccesses++;
        } else if (result == 2) {
          throw new Error(['Invalid Vendor', 'vendor']);
        } else if (result == 3) {
          throw new Error(['Invalid Site', 'siteID']);
        } else {
          throw new Error(['Invalid Storeroom', 'storeroom']);
        }
      } catch (err) {
        numFails++;
        // highlight the cells that have invalid values to red
        postMessage(['updateColors', rowIndex + 1, err[1]]);
        // Creates toast for the error
        postMessage(['runCallback', 'failure', `Failed Inventory upload of ${item.description}. ${err}`]);
        // Adds error to log
        postMessage(['fail', `Failed Inventory upload of ${item.description}. ${err}`]);
        // updates item status to 'warning'
        postMessage(['update', 'partial', rowIndex]);
        console.error(`Failed inventory upload of \"${item.description}\", ${err}`);
      }
    }
    // console.log(rowIndex);
  }
  postMessage(['result', newNums, numFails, numSuccesses, numStoreroomSuccesses]);
}
/**
 * Uploads images to Maximo at the item master level
 * @param {File[]} images
 */
async function uploadImages(images) {
  try {
    const maximo = new Maximo();
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // try to upload the image
      const data = await maximo.uploadImageToMaximo(img);
      const result = data[0];

      // handle result of upload
      postMessage(['runCallback', result, i]);

      // log result
      if (result == 'success') {
        postMessage(['debug', `${img.name} upload success`]);
      } else if (result == 'fail' || result == 'warning') {
        postMessage(['fail', `${img.name} upload fail; ${data[1]}`]);
      }
    }
    postMessage(['result', 'done']);
  } catch (err) {
    console.log(err);
    postMessage(['result', 'total failure', err]);
  }
}


