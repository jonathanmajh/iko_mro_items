
(function() {
  if (!(localStorage.getItem('theme'))) {
    localStorage.setItem('theme', 'dark');
  }

  document.documentElement.setAttribute('data-bs-theme', localStorage.getItem('theme'));
})();

// classes
class WorkerHandler {
  async work(params, callback) {
    const worker = new Worker('./worker.js');
    worker.postMessage(params);
    worker.onmessage = (e) => {
      const log = new Logging();
      if (e.data[0] === 'result') {
        worker.terminate();
        callback(e.data.slice(1));
      } else if (e.data[0] === 'error') {
        new Toast(e.data[1], 'bg-danger');
        const bar = new ProgressBar();
        bar.update(100, e.data[1]);
        log.error(e.data[1]);
        worker.terminate();
      } else if (e.data[0] === 'progress') {
        const bar = new ProgressBar();
        log.info(e.data[2]);
        bar.update(e.data[1], e.data[2]);
      } else if (e.data[0] === 'warning') {
        new Toast(e.data[1], 'bg-warning');
        log.warning(e.data[1]);
      } else if (e.data[0] === 'info') {
        new Toast(e.data[1], 'bg-info');
        log.info(e.data[1]);
      } else if (e.data[0] === 'debug') {
        log.info(e.data[1]);
      } else if (e.data[0] === 'fail') {
        log.error(e.data[1]);
      } else if (e.data[0] === 'update') {
        updateItemStatus(e.data[1], e.data[2]);
      } else if (e.data[0] === 'updateColors') {
        updateTableColors(e.data[1], e.data[2]);
      } else if (e.data[0] === 'runCallback') {
        callback(e.data.slice(1));
      } else if (e.data[0] === 'upload-error') {
        new Toast(`${e.data[1]} error. Upload failed.`, 'bg-danger');
        worker.terminate();
        callback(e.data[2]);
      } else {
        console.log(`Unimplemented worker message ${e.data}`);
      }
    };
  }
}

class Logging {
  constructor() {
    this.logTable = document.getElementById('logs-table');
  }

  warning(msg) {
    const row = this.logTable.insertRow(0);
    row.innerHTML = `<td>WARNING</td><td>${msg}</td>`;
    row.classList.add('table-warning');
  }

  error(msg) {
    const row = this.logTable.insertRow(0);
    row.innerHTML = `<td>ERROR</td><td>${msg}</td>`;
    row.classList.add('table-danger');
  }

  info(msg) {
    const row = this.logTable.insertRow(0);
    row.innerHTML = `<td>INFO</td><td>${msg}</td>`;
    row.classList.add('table-primary');
  }
}

class ProgressBar {
  constructor(barId = 'progress-bar', textId = 'progress-text') {
    this.progressBar = document.getElementById('progress-bar');
    this.progressText = document.getElementById('progress-text');
    this.currentProgress = this.progressBar.getAttribute('style');
    this.currentProgress = this.currentProgress.slice(7, this.currentProgress.length - 2);
  }

  updateProgressBar(percent) {
    this.progressBar.setAttribute('style', `width: ${percent}%;`);
  }

  update(percent, message, color = '') {
    this.updateProgressBar(percent);
    if (message) {
      this.progressText.innerText = message;
    }
    if (!color && percent == 0) {
      this.updateColor('bg-success');
    } else if (color) {
      this.updateColor(color);
    }
  }

  updateColor(color) {
    color = color + ' ';
    const regx = new RegExp('\\b' + 'bg-' + '[^ ]*[ ]?\\b', 'g');
    this.progressBar.className = this.progressBar.className.replace(regx, color);
  }

  addProgressBar(percent, message = null) {
    this.update(percent + this.currentProgress, message);
  }

  getProgress() {
    return {
      'percent': this.currentProgress,
      'message': this.progressText.innerText,
    };
  }
}

class Toast {
  // popup thingy in top right corner
  constructor(newMessage, color = 'bg-primary') { // uses Bootstrap 4 colors
    this.toastContainer = document.getElementById('toastPlacement');
    this.newToast(newMessage, color);
  }

  newToast(message, color) {
    const toast = document.createElement('div');
    toast.setAttribute('class', `toast d-flex align-items-center border-0 text-white  ${color}`);
    toast.innerHTML = `<div class="toast-body">${message}</div><button type="button" class="btn-close ms-auto me-2" data-bs-dismiss="toast"></button>`;
    const bsToast = new bootstrap.Toast(toast);
    this.toastContainer.appendChild(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', (e) => {
      e.target.remove();
    });
  }
}

/**
 * Class to represent an item to upload to Maximo
 */
class Item {
  /**
   * nine series number for the item to upload
   * @type {Number}
  */
  itemnumber;
  /**
   * description of the item
   * @type {String}
   */
  description;
  /**
   * issue unit code of the item 
   * @type {String}
   */
  issueunit;
  /**
   * commodity group code of the item
   * @type {String}
   */
  commoditygroup;
  /**
   * GL class code of the item 
   * @type {String}
   */
  glclass;
  /**
   * the site (code) the item goes to
   * @type {String}
   */
  siteID;
  /**
   * storeroom (3 character code) to add the item to
   * @type {String}
   */
  storeroomname;
  /**
   * vendor id (e.g. V#####)
   * @type {String}
   */
  vendorname;
  /**
   * catalog number for the item (vendor part number) 
   * @type {String}
   */
  cataloguenum;
  /**
   * manufacturer name (code) of the item
   * @type {String}
   */
  manufacturername;
  /**
   * model/manufacturer part number/code
   * @type {String}
   */
  modelnum;
  /**
   * type of manufacturer (specific or generic)
   * @type {"Generic"|"Other"}
   */
  manufacturertype;
  /**
   * type of maximo number (e.g. 91, 98, 99, etc) 
   * @type {String}
   */
  series;
  /**
   * details field for the item
   * @type {String}
   */
  longdescription;
  assetprefix;
  assetseed;
  jpnum;
  inspectionrequired;
  isimport;
  rotating;
  /**
   * array of assets to add the item as a spare part to
   * @type {Array<{asset:String, quantity:Number}>}
   */
  assetInfo;
  /**
   * url of the item page on the vendor website
   * @type {String}
   */
  websiteURL;
  /**
   * inventory abc type
   * @type {"A"|"B"|"C"|null}
   */
  abctype;
  /**
   * inventory cycle count frequency
   * @type {Number}
   */
  ccf;
  /**
   * inventory economic order quantity
   * @type {Number}
   */
  orderqty;
  /**
   * inventory reorder point
   * @type {Number}
   */
  reorderpnt;
  /**
   * code for the item's site's organization
   * @type {"IKO-CAD"|"IKO-EU"|"IKO-UK"|"IKO-US"|null}
   */
  orgId;

  // add more properties later (e.g manufacturer, part num, etc.)
  /**
   * Create a new item object
   * @param {{itemnumber:!Number,
   * description:!String,
   * issueunit:String,
   * commoditygroup:String,
   * glclass:String,
   * siteID:String,
   * storeroomname:String,
   * vendorname:String,
   * cataloguenum:String,
   * manufacturername:String,
   * modelnum:String,
   * manufacturertype: "Generic"|"Other",
   * series:(Number|String),
   * longdescription:String,
   * assetprefix,
   * assetseed,
   * jpnum,
   * inspectionrequired,
   * isimport,
   * rotating,
   * assetInfo:Array<{asset:String, quantity:Number}>,
   * websiteURL:String,
   * abctype:String,
   * ccf:String,
   * orderqty: Number,
   * reorderpnt: Number}} iteminfo - object literal of the item's info 
   */
  constructor(iteminfo = {}) {
    for (var info in iteminfo) {
      if (this.hasOwnProperty(info)){
        if(iteminfo[info] != undefined && iteminfo[info] != null){
          if(info == 'assetInfo') {//assetInfo needs to be deep cloned to prevent reassignment errors 
            this[info] =  JSON.parse(JSON.stringify(iteminfo[info]))
          } else {
            this[info] = iteminfo[info];
          }
        }
      }
    }
    //set default values for properties that don't exist (can't use optional parameters for object literal arguments...)
    const defaults = {
      itemnumber: 0,
      siteID: '',
      storeroomname: '',
      vendorname: '',
      cataloguenum: '',
      longdescription: '',
      assetprefix: '',
      assetseed: '',
      jpnum: '',
      inspectionrequired: 0,
      isimport: 0,
      rotating: 0,
      assetInfo: [],
      orderqty: 0,
      ccf: 0,
      reorderpnt: -1,
      websiteURL: '',
      abctype: '',
    };
    for(const property in defaults){
      if(!iteminfo.hasOwnProperty(property)){
        this[property] = defaults[property];
      }
    }
    if(!this.series) {
      if(this.itemnumber){
        this.series = Item.determineSeries(this.itemnumber);
      } else {
        this.series = 91;
      }
    }
  }
  
  /**
   * Modifies the asset spare part info according to a list. If the list is longer, increase the number of asset spare part entries accordingly.
   * @param {Array<String>| Array<{asset:String, quantity:Number}>} data - data to change/add
   * @param {'asset'|'quantity'|'both'} type - the type of data to change
   */
  setAssetInfo(data, type){
    if(!this.assetInfo) this.assetInfo = [];
    const sizeDiff = data.length - this.assetInfo.length;
    for(let i  = 0; i < sizeDiff; i++){
      this.assetInfo.push({asset: '', quantity:1});
    }
    if(type === 'asset') {
      for(const[idx, value] of data.entries()){
        this.assetInfo[idx].asset = value;
      }
    } else if (type === 'quantity') {
      for(const[idx, value] of data.entries()){
        this.assetInfo[idx].quantity = value;
      }
    } else if (type === 'both') {
      for(const[idx, value] of data.entries()){
        this.assetInfo[idx] = value;
      }
    }
  }


  /**
   * Determines the item series type for a given 9 series number 
   * @param {Number|String} itemnum -
   * @returns {"91"|"98"|"99"|"9S"|null} string code of the item series type, null if input is not a valid item number
   */
  static determineSeries(itemnum){
    if(typeof itemnum === 'string') {
      if(Number(itemnum)) {
        itemnum = Number(itemnum)
      } else if (itemnum.length == 7 && itemnum.slice(0, 2).toUpperCase() === "9S" && Number.isInteger(Number(itemnum.slice(2)))) {
        return "9S";
      }
    }
    if(typeof itemnum === 'number'){
      if(itemnum >= 9000000 && itemnum < 10000000){
        if(itemnum >= 9900000){
          return "99";
        } else if (itemnum >= 9800000){
          return "98";
        } else {
          return "91";
        }
      }
    }
    return null;
  }
}
// functions
// general
function fixSwitch() {
  document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
}

function toTop() {
  const element = document.getElementsByTagName('main');
  element[0].scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function toEnd() {
  const element = document.getElementsByTagName('main');
  element[0].scrollTop = element[0].scrollHeight; // For Chrome, Firefox, IE and Opera
}
// theme related
function toggleTheme() {
  setTheme(localStorage.getItem('theme') === 'dark' ? 'light' : 'dark');
}

function setTheme(newTheme) {
  // safety
  if (localStorage.getItem('theme') === newTheme) {
    return;
  }

  localStorage.setItem('theme', `${newTheme}`);
  document.documentElement.setAttribute('data-bs-theme', newTheme);
}

function loadTheme() {
  if (!(localStorage.getItem('theme'))) {
    localStorage.setItem('theme', 'dark');
  }

  document.documentElement.setAttribute('data-bs-theme', localStorage.getItem('theme'));
  // console.log('i have run');
}
// upload item related
function getNextNumThenUpdate(series) {
  document.getElementById('error').innerHTML = 'Waiting for confirm...';
  const worker = new WorkerHandler();
  document.getElementById('confirm-btn').innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span> Loading...</span>';
  document.getElementById('confirm-btn').disabled = true;
  document.getElementById('item-itemnum').innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span> Retreiving the latest item number...</span>';
  worker.work(['getCurItemNumber', series], updateItemInfo);
  console.log('Getting new number from server');
}

/**
 * Gets the storeroom code from a string in the form 'XXX: [Some] Storeroom'
 * @param {String} storeroomStr - string in the form  'XXX: [Some] Storeroom'
 * @returns {String} the storeroom code (XXX)
 */
function isolateStoreroomCode(storeroomStr) {
  const upperStr = storeroomStr.toUpperCase();
  const positions = [upperStr.indexOf(':'), upperStr.indexOf("STOREROOM")]
  if(positions[0] != -1 && positions[1] != -1) {
    return upperStr.slice(0, positions[0]) + upperStr.slice(positions[1] + 9);
  } else { //string does not contain ": [Some] Storeroom"
    return storeroomStr
  }
}

function updateItemInfo(curItemNum) {
  console.log(curItemNum);

  if (curItemNum[0] === 0) {
    throw new Error(curItemNum[1]);
  }

  const itemnum = document.getElementById('interact-num');
  itemnum.value = curItemNum[1] + 1;
  const desc = document.getElementById('request-desc');
  const uom = document.getElementById('uom-field');
  const commGroup = document.getElementById('com-group');
  const glclass = document.getElementById('gl-class');
  document.getElementById('item-itemnum').value = itemnum.value;
  document.getElementById('item-desc').value = sanitizeString(desc.value);
  document.getElementById('item-uom').value = uom.value;
  document.getElementById('item-commgroup').value = commGroup.value;
  document.getElementById('item-glclass').value = glclass.value;

  document.getElementById('confirm-btn').innerHTML = 'Upload Item';
  document.getElementById('confirm-btn').disabled = false;
}

function poppulateModal() {
  const desc = document.getElementById('request-desc');
  const uom = document.getElementById('uom-field');
  const commGroup = document.getElementById('com-group');
  const glclass = document.getElementById('gl-class');

  document.getElementById('item-descr').value = desc.value;
  document.getElementById('issue-unit').value = uom.value;
  document.getElementById('comm-grp').value = commGroup.value;
  document.getElementById('gl-class-new').value = glclass.value;
}

/**
 * Replaces illegal characters in the raw item description with legal equivalents
 * @param {String} raw_str - the original string to process
 * @returns {String} the processed string
 */
function replaceChars(raw_str) {
for (const [key] in CONSTANTS.REPLACEMENTS) {
raw_str = raw_str.replaceAll(key, CONSTANTS.REPLACEMENTS[key]);
}
console.log(raw_str)
return raw_str;
}
/**
 * Removes and replaces illegal characters for strings used in Maximo item entries.
 * @param {String} str - the string to sanitize 
 * @returns the sanitized string
 */
function sanitizeString(str) {
  const badChars = ['<', '>'];
  for (const badChar of badChars) {
    str = str.replaceAll(badChar, '');
  }
  str = str.replaceAll(/&nbsp;/g, ' ').replaceAll(/\u00A0/g, ' ');
  str = replaceChars(str)
  return str;
}
/**
 * Converts to batch upload paste to table
 * @param {String} pastedInput - string representation of the pasted output
 * @param {String} id - new id for the HTML table 
 * @returns {String} string representation of the HTML table
 */
function convertToBatchUploadTable(pastedInput, id = '') {
  let rawRows = pastedInput.split('\n');
  let numRows = rawRows.length;
  let numCols = 0;
  const bodyRows = [];
  let diff = 0;
  if (!pastedInput.toUpperCase().includes('MAXIMO')) {
    numRows++;
    const firstRow = ('Maximo\tDescription\tIssue Unit\tCommodity Group\tGL Class');
    rawRows = [firstRow, ...rawRows];
  }
  rawRows.forEach((rawRow, idx) => {
    const rawRowArray = rawRow.split('\t');
    if (rawRow == 0) {
      diff--;
      numRows--;
    } else {
      if (rawRowArray.length > numCols) {
        numCols = rawRowArray.length;
      }
      bodyRows.push(`<tr>\n`);
      rawRowArray.forEach(function(value, index) {
        bodyRows.push(`\t<td id="${(idx + diff + 1) + '-' + (index + 1)}">${value}</td>\n`);
      });
      if (idx == 0) {
        bodyRows.push(`<td style="border-left: 2px solid;" contentEditable="false"></td>`);
      } else {
        bodyRows.push(`<td id="item-${idx + diff}-status" contentEditable="false" style="border-left: 2px solid; width:0.1%; white-space: nowrap;"><i class="material-symbols-outlined mt-2">pending</i></td>`);
      }
      bodyRows.push(`</tr>\n`);
    }
  });
  const table = `
<table class="table table-primary table-striped" data-rows="${numRows}" data-cols="${numCols}" id="${id}" style="margin-bottom: 0px" contenteditable>
${bodyRows.join('')}
</table>
    `;

  return table;
}
/**
 * Converts to template upload paste to table
 * TODO: catch improper paste types
 * @param {String} pastedInput - string representation of the pasted output
 * @param {String} id - new id for the HTML table 
 * @returns {String} string representation of the HTML table
 */
function convertToTemplateUploadTable(pastedInput, id=''){
  let rawRows = pastedInput.split('\n');
  let numRows = rawRows.length;
  let numCols = 0;
  const tablebody = [];
  let diff = 0;
  const rowids = [];
  // create html row for each pasted line
  for (const [idx, rawRow] of rawRows.entries()){ 
    const rowArr = rawRow.split('\t');
    if (rawRow == 0) {
      diff--;
      numRows--;
    } else { 
      if (rowArr.length > numCols) {
        numCols = rowArr.length;
      }
      //calculate table row id
      let rowid = rowArr[0].replace(' ','_').replace(':','');
      if (rowids.includes(rowid)) { //no duplicate table rows
        return `
        <table class="table table-primary table-striped" data-rows="1" data-cols="1" id="${id}" style="margin-bottom: 0px">
          <tr>
            <td>Improper Paste Format: First column cannot contain duplicate values</td>
          </tr>
        </table>
        `;
      } else {
        rowids.push(rowid); 
      }

      tablebody.push(`<tr id="template-${rowid}">`);
      rowArr.forEach((value, index) => {
        if (index == 0){ //"header" col (on the left)
          tablebody.push(`\t<td id="${(idx + diff + 1) + '-' + (index + 1)}" style="border: 2px solid; width:20%;" contentEditable="false">${value}</td>\n`)
        } else { //"body" col
          tablebody.push(`\t<td id="${(idx + diff + 1) + '-' + (index + 1)}" style="border: 1px solid">${value}</td>\n`);
        }
      })
      tablebody.push('</tr>\n');
    }
  }
  return `
  <table class="table table-primary table-striped" data-rows="${numRows}" data-cols="${numCols}" id="${id}" style="margin-bottom: 0px; width:100%;" contenteditable>
  ${tablebody.join('')}
  </table>
      `;
}
// Highlights cells red for any cell with invalid data
function updateTableColors(itemindex, category) {
  const colLoc = {
    description: -1,
    uom: -1,
    commGroup: -1,
    glClass: -1,
    maximo: -1,
    vendor: -1,
    storeroom: -1,
    catNum: -1,
    siteID: -1,
  };
  const table = document.getElementById('batch-items-table');
  // Assign column locations
  const cols = parseInt(table.getAttribute('data-cols'));
  // go through first row to find headings.
  for (let i = 1; i <= cols; i++) {
    // get a cell in the table by its id
    const cell = document.getElementById('1-' + i);
    // see if cell value matches any of the required parameters to create an item object
    if (cell.innerHTML.toUpperCase() === 'DESCRIPTION') {
      colLoc.description = i;
    } else if (cell.innerHTML.toUpperCase() === 'UOM' || cell.innerHTML.toUpperCase() === 'ISSUE UNIT') {
      colLoc.uom = i;
    } else if (cell.innerHTML.toUpperCase() === 'COMMODITY GROUP' || cell.innerHTML.toUpperCase() === 'COMM GROUP') {
      colLoc.commGroup = i;
    } else if (cell.innerHTML.toUpperCase() === 'GL CLASS') {
      colLoc.glClass = i;
    } else if (cell.innerHTML.toUpperCase() === 'SITEID' || cell.innerHTML.toUpperCase() === 'SITE') {
      colLoc.siteID = i;
    } else if (cell.innerHTML.toUpperCase() === 'STOREROOM' || cell.innerHTML.toUpperCase() === 'STOREROOM') {
      colLoc.storeroom = i;
    } else if (cell.innerHTML.toUpperCase() === 'VENDOR' || cell.innerHTML.toUpperCase() === 'VENDOR NUMBER') {
      colLoc.vendor = i;
    } else if (cell.innerHTML.toUpperCase() === 'CAT NUMBER' || cell.innerHTML.toUpperCase() === 'CATALOG NUMBER' || cell.innerHTML.toUpperCase() === 'CATALOGUE NUMBER') {
      colLoc.catNum = i;
    } else if (cell.innerHTML.toUpperCase() === 'MAXIMO' || cell.innerHTML.toUpperCase() === 'ITEM NUMBER') {
      colLoc.maximo = i;
    }
  }
  const colNum = colLoc[category];
  const cell = document.getElementById(`${itemindex}-${colNum}`);
  // change color of cell
  cell.classList.add('table-danger');
}

function updateItemStatus(status, itemindex) {
  // Changes item status column to reflect status
  const statusimg = document.getElementById(`item-${itemindex}-status`);
  if (status == 'fail') {
    statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">close</i>`;
  } else if (status == 'success') {
    statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">done</i>`;
  } else if (status == 'loading') {
    statusimg.innerHTML = `<div class="spinner-border mt-1 mb-1" style="width: 24px; height: 24px;" role="status"></div>`;
  } else if (status == 'error') {
    statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">error</i>`;
  } else if (status == 'partial') {
    statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">warning</i>`;
  } else {
    statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">pending</i>`;
  }
}

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function() {
      resolve(reader.result);
    };
    reader.onerror = function(error) {
      reject(error);
    };
  });
}
