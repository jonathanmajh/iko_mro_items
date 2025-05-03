
(function() {
  if (!(localStorage.getItem('theme'))) {
    localStorage.setItem('theme', 'dark');
  }

  document.documentElement.setAttribute('data-bs-theme', localStorage.getItem('theme'));
})();

// classes
/**
 * class to handle Worker processes. Run WorkerHandler.work for every Worker task
 * 
 */
class WorkerHandler {
  /**
   * Create a new Worker process
   * @param {Array} params - parameters for the Worker task. params[0] is the name of the task, all task names are listed in worker.js. params[1] and onwards are the arguments for the Worker task.  
   * @param {function|undefined} callback - callback function for the Worker    
   */
  async work(params, callback) {
    const worker = new Worker('./worker.js');
    worker.postMessage(params); //worker starts task
    //handle message from worker
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
/**
 * Class to handle logs. Logs in a table at the bottom of the application
 */
class Logging {
  /**
   * create a new table for the logs
   */
  constructor() {
    this.logTable = document.getElementById('logs-table');
  }
  /**
   * Prints a warning message to the log table
   * @param {String} msg - warning mesage to display 
   */
  warning(msg) {
    const row = this.logTable.insertRow(0);
    row.innerHTML = `<td>WARNING</td><td>${msg}</td>`;
    row.classList.add('table-warning');
  }
  /**
   * Prints an error message to the log table
   * @param {String} msg - error message to display
   */
  error(msg) {
    const row = this.logTable.insertRow(0);
    row.innerHTML = `<td>ERROR</td><td>${msg}</td>`;
    row.classList.add('table-danger');
  }
  /**
   * Prints a message to the log table
   * @param {String} msg - message to display 
   */
  info(msg) {
    const row = this.logTable.insertRow(0);
    row.innerHTML = `<td>INFO</td><td>${msg}</td>`;
    row.classList.add('table-primary');
  }
}
/**
 * Progress bar on the top of the application
 */
class ProgressBar {
  /**
   * Creates a new progress bar
   */
  constructor(barId = 'progress-bar', textId = 'progress-text') {
    this.progressBar = document.getElementById('progress-bar');
    this.progressText = document.getElementById('progress-text');
    this.currentProgress = this.progressBar.getAttribute('style');
    this.currentProgress = this.currentProgress.slice(7, this.currentProgress.length - 2);
  }
  /**
   * Sets the current percentage of the progress bar
   * @param {Number|String} percent - the percent to set the progress bar to (number only, i.e. to set to 50%, percent = 50 or "50") 
   */
  updateProgressBar(percent) {
    this.progressBar.setAttribute('style', `width: ${percent}%;`);
  }
  /**
   * Change the progress bar
   * @param {Number|String} percent - the percent to set the progress bar to (number only, i.e. to set to 50%, percent = 50 or "50")   
   * @param {String} message - the message to put on the progress bar
   * @param {String} color - the color to set the progress bar to (uses Bootstrap 4 colors) 
   */
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
  /**
   * Change the color of the progress bar
   * @param {String} color - the color to set the progress bar to (uses Bootstrap 4 color names) 
   */
  updateColor(color) {
    color = color + ' ';
    const regx = new RegExp('\\b' + 'bg-' + '[^ ]*[ ]?\\b', 'g');
    this.progressBar.className = this.progressBar.className.replace(regx, color);
  }
  /**
   * Increases the current progress bar progress
   * @param {Number} percent - the percentage to increase the progress bar by
   * @param {String?} [message] - message to display
   */
  addProgressBar(percent, message = null) {
    this.update(percent + this.currentProgress, message);
  }
  /**
   * 
   * @returns {{'percent': Number, 'message':String}} the current status of the progress bar
   */
  getProgress() {
    return {
      'percent': this.currentProgress,
      'message': this.progressText.innerText,
    };
  }
}

/**
 * popup thingy in the top right corner
 */
class Toast {
  /**
   *  creates a Toast (popup thingy in top right corner).
   * @param {string} newMessage - message to put on the Toast
   * @param {string} [color = 'bg-primary'] - background color of the Toast. Uses Bootstrap 4 background colors
   */
  constructor(newMessage, color = 'bg-primary') {
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
 * Class for a Maximo item
 */
class Item {
  // add more properties later (e.g manufacturer, part num, etc.)
  constructor(itemnumber = 0, description, issueunit, commoditygroup, glclass, siteID = '', storeroomname = '', vendorname = '', cataloguenum = '', series = 91, longdescription = '', assetprefix = '', assetseed = '', jpnum = '', inspectionrequired = 0, isimport = 0, rotating = 0) {
    this.itemnumber = itemnumber;
    this.series = series;
    this.description = description;
    this.issueunit = issueunit;
    this.commoditygroup = commoditygroup;
    this.glclass = glclass;
    this.longdescription = longdescription;
    this.assetprefix = assetprefix;
    this.assetseed = assetseed;
    this.jpnum = jpnum;
    this.inspectionrequired = inspectionrequired;
    this.isimport = isimport;
    this.rotating = rotating;
    this.siteID = siteID;
    this.storeroomname = storeroomname;
    this.vendorname = vendorname;
    this.cataloguenum = cataloguenum;
  }
}
// functions
// general
/**
 * Updates the darkmode switch
 */
function fixSwitch() {
  document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
}

/**
 * Scrolls application to the top
 */
function toTop() {
  const element = document.getElementsByTagName('main');
  element[0].scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

/**
 * Scrolls application to the bottom
 */
function toEnd() {
  const element = document.getElementsByTagName('main');
  element[0].scrollTop = element[0].scrollHeight; // For Chrome, Firefox, IE and Opera
}

// theme related
/**
 * Toggles the application between dark/light modes
 */
function toggleTheme() {
  setTheme(localStorage.getItem('theme') === 'dark' ? 'light' : 'dark');
}

/**
 * Sets the theme of the application
 * @param {'dark'|'light'} newTheme - the theme to set the application to
 */
function setTheme(newTheme) {
  // safety
  if (localStorage.getItem('theme') === newTheme) {
    return;
  }

  localStorage.setItem('theme', `${newTheme}`);
  document.documentElement.setAttribute('data-bs-theme', newTheme);
}

/**
 * Load the theme of the application to the UI. If localStorage does not have a theme, use dark mode by default
 */
function loadTheme() {
  if (!(localStorage.getItem('theme'))) {
    localStorage.setItem('theme', 'dark');
  }

  document.documentElement.setAttribute('data-bs-theme', localStorage.getItem('theme'));
  // console.log('i have run');
}
// upload item related
/**
 * Creates a WorkerHandler to get the current 9-series number (largest used) and updates the UI
 * @param {"91"|"98"|"99"|"9S"} series - the type of 9-series number to get 
 */
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
 * Updates the information in the "Upload New Item" window
 * @param {Array<Number>} curItemNum - length 2 list containing a status flag in position 0 (1 if success, 0 if error) and the current item number in position 1 (new item will use current item number + 1)
 */
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
/**
 * Enters the Request Item info into the "Upload/Request New Item" popup
 */
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
 * Converts the pasted input from the user into a table. For batch upload.
 * @param {String} pastedInput - string representation of the pasted input 
 * @param {String} id - the id for the HTML table created  
 * @returns {String} the string representation of the HTML table created
 */
function convertToTable(pastedInput, id = '') {
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
 * Update the batch upload table's rows to red if unable to upload  
 * @param {Number} itemindex - the row to highlight
 * @param {String} category - the error message (? not sure, have to double check)
 */
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
/**
 * Update the status icon for a row in the batch upload table
 * @param {String} status - the new status of the row (e.g. 'success', 'loading', 'error', etc) 
 * @param {Number} itemindex - the row of the item in the batch upload table
 */
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
/**
 * Reads and returns the contents of a File object (base 64)
 * @param {Blob|File} file - file object to read 
 * @returns {Promise} contents of file
 */
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
