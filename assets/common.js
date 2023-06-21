//runs automagically

(function() {
    if(!(localStorage.getItem('theme'))){
        localStorage.setItem('theme','dark');
    }

    document.documentElement.setAttribute('data-bs-theme',localStorage.getItem('theme'));
})();

//classes
class WorkerHandler {
    async work(params, callback) {
        const worker = new Worker('./worker.js');
        worker.postMessage(params);
        worker.onmessage = (e) => {
            let log = new Logging();
            if (e.data[0] === 'result') {
                worker.terminate();
                callback(e.data.slice(1,));
            } else if (e.data[0] === 'error') {
                new Toast(e.data[1], 'bg-danger');
                let bar = new ProgressBar();
                bar.update(100, e.data[1]);
                log.error(e.data[1]);
                worker.terminate();
            } else if (e.data[0] === 'progress') {
                let bar = new ProgressBar();
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
            } else if (e.data[0] === 'fail'){
                log.error(e.data[1]);
            } else if (e.data[0] === 'update'){
                updateItemStatus(e.data[1],e.data[2]);
            } else if (e.data[0] === 'runCallback'){
                callback(e.data.slice(1,));
            } else {
                console.log(`Unimplemented worker message ${e.data}`);
            }
        };
    }
}

class Logging {
    constructor() {
        this.logTable = document.getElementById("logs-table");
    }

    warning(msg) {
        let row = this.logTable.insertRow();
        row.innerHTML = `<td>WARNING</td><td>${msg}</td>`;
        row.classList.add("table-warning");
    }

    error(msg) {
        let row = this.logTable.insertRow();
        row.innerHTML = `<td>ERROR</td><td>${msg}</td>`;
        row.classList.add("table-danger");
    }

    info(msg) {
        let row = this.logTable.insertRow();
        row.innerHTML = `<td>INFO</td><td>${msg}</td>`;
        row.classList.add("table-primary");
    }
}

class ProgressBar {
    constructor(barId = "progress-bar",textId = "progress-text") {
        this.progressBar = document.getElementById("progress-bar");
        this.progressText = document.getElementById("progress-text");
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
        let regx = new RegExp('\\b' + 'bg-' + '[^ ]*[ ]?\\b', 'g');
        this.progressBar.className = this.progressBar.className.replace(regx, color);
    }

    addProgressBar(percent, message = null) {
        this.update(percent + this.currentProgress, message);
    }

    getProgress() {
        return {
            'percent': this.currentProgress,
            'message': this.progressText.innerText
        };
    }
}

class Toast {
    //popup thingy in top right corner
    constructor(newMessage, color = 'bg-primary') {
        this.toastContainer = document.getElementById('toastPlacement');
        this.newToast(newMessage, color);
    }

    newToast(message, color) {
        let toast = document.createElement('div');
        toast.setAttribute('class', `toast d-flex align-items-center border-0 text-white ${color}`);
        toast.innerHTML = `<div class="toast-body">${message}</div><button type="button" class="btn-close ms-auto me-2" data-bs-dismiss="toast"></button>`;
        let bsToast = new bootstrap.Toast(toast);
        this.toastContainer.appendChild(toast);
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', (e) => {
            e.target.remove();
        });
    }
}

class Item {
    //add more properties later (e.g storeroom, manufacturer, etc.)
    constructor(itemnumber=0, description, issueunit, commoditygroup, glclass, series=91, longdescription = "", assetprefix = "", assetseed = "", jpnum = "", inspectionrequired = 0, isimport = 0, rotating = 0){
        this.itemnumber = itemnumber;
        this.series=series;
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
    }
}
//functions
    //general
function fixSwitch(){
    document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
}

function toTop() {
    let element = document.getElementsByTagName("main");
    element[0].scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function toEnd() {
    let element = document.getElementsByTagName("main");
    element[0].scrollTop = element[0].scrollHeight; // For Chrome, Firefox, IE and Opera
}
    //theme related
function toggleTheme(){
    setTheme(localStorage.getItem('theme') === 'dark' ? 'light' : 'dark');
}

function setTheme(newTheme){
    //safety
    if(localStorage.getItem('theme')===newTheme){
        return;
    }

    localStorage.setItem('theme', `${newTheme}`);
    document.documentElement.setAttribute("data-bs-theme",newTheme);
}

function loadTheme(){
    if(!(localStorage.getItem('theme'))){
        localStorage.setItem('theme','dark');
    }

    document.documentElement.setAttribute('data-bs-theme',localStorage.getItem('theme'));
    console.log('i have run');
}
    //upload item related
function getNextNumThenUpdate(series){
        document.getElementById("error").innerHTML = "Waiting for confirm...";
        const worker = new WorkerHandler();
        document.getElementById("confirm-btn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span> Loading...</span>';
        document.getElementById("confirm-btn").disabled = true;
        document.getElementById("item-itemnum").innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span> Retreiving the latest item number...</span>';
        worker.work(['getCurItemNumber',series], updateItemInfo);
        console.log("Getting new number from server")
}

function updateItemInfo(curItemNum){
    console.log(curItemNum);

    if(curItemNum[0]===0){
        throw new Error(curItemNum[1]);
    }

    let itemnum = document.getElementById("interact-num");
        itemnum.value = curItemNum[1] + 1;
    let desc = document.getElementById("maximo-desc");
    let uom = document.getElementById("uom-field");
    let commGroup = document.getElementById("com-group");
    let glclass = document.getElementById("gl-class");

    document.getElementById("item-itemnum").innerHTML=itemnum.value;
    document.getElementById("item-desc").innerHTML=desc.value;
    document.getElementById("item-uom").innerHTML=uom.value;
    document.getElementById("item-commgroup").innerHTML=commGroup.value;
    document.getElementById("item-glclass").innerHTML=glclass.value;

    document.getElementById("confirm-btn").innerHTML = "Upload Item";
    document.getElementById("confirm-btn").disabled = false;
}

function sanitizeString(str){
    let badChars = ['<','>'];
    for(const badChar of badChars){
        str = str.replaceAll(badChar,"");
    }
    str = str.replaceAll(/&nbsp;/g, " ").replaceAll(/\u00A0/g, " ");
    return str;
}

function convertToTable(pastedInput,id="")
{
    let rawRows = pastedInput.split("\n");
    let numRows=rawRows.length;
    let numCols=0;
    let bodyRows = [];
    let diff = 0;
    rawRows.forEach((rawRow, idx) => {
        let rawRowArray = rawRow.split("\t");
        if (rawRow==0) {
            diff--;
            numRows--;
        } else {
            if(rawRowArray.length>numCols){
                numCols=rawRowArray.length;
            }
            bodyRows.push(`<tr>\n`);
            rawRowArray.forEach(function(value,index){
                bodyRows.push(`\t<td id="${(idx+diff+1) + '-' + (index+1)}">${value}</td>\n`);
            })
            if(idx==0){
                bodyRows.push(`<td style="border-left: 2px solid;" contentEditable="false"></td>`);
            } else {

                bodyRows.push(`<td id="item-${idx+diff}-status" contentEditable="false" style="border-left: 2px solid; width:0.1%; white-space: nowrap;"><i class="material-symbols-outlined mt-2">pending</i></td>`);
            }
            bodyRows.push(`</tr>\n`);
        }
    })
    let tab = `
<table class="table table-primary table-striped" data-rows="${numRows}" data-cols="${numCols}" id="${id}" style="margin-bottom: 0px" contenteditable>
${bodyRows.join("")}
</table>
    `;
    
    return tab;
}

function updateItemStatus(status,itemindex){
    let statusimg = document.getElementById(`item-${itemindex}-status`);
    if(status=="fail"){
        statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">close</i>`;
    } else if(status=="success"){
        statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">done</i>`;
    } else if(status=="loading"){
        statusimg.innerHTML = `<div class="spinner-border mt-1 mb-1" style="width: 24px; height: 24px;" role="status"></div>`;
    } else if(status=="error"){
        statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">error</i>`;
    } else {
        statusimg.innerHTML = `<i class="material-symbols-outlined mt-2">pending</i>`;
    }
}

function fileBase64(file) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function(error) {
        reject(error);
      };
    });
  }