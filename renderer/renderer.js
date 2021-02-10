// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { clipboard, ipcRenderer, shell } = require('electron')
const { dialog } = require('electron').remote
const Database = require('../assets/indexDB')
const Validate = require('../assets/validators')

document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("valid-triple").addEventListener("click", validTriple);
document.getElementById("batch-file").addEventListener("click", validBatch);
// document.getElementById("template-file").addEventListener("click", test);
document.getElementById("single-copy").addEventListener("click", () => { copyResult('single') });
document.getElementById("triple-copy").addEventListener("click", () => { copyResult('triple') });
document.getElementById("triple-paste").addEventListener("click", triplePaste);
document.getElementById("valid-file").addEventListener("click", openFile);
document.getElementById("settings").addEventListener("click", openSettings);
document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);
document.getElementById("interactive").addEventListener("click", () => { openExcel(1) });

document.getElementById("recheck-desc").addEventListener("click", checkAgain);
document.getElementById("save-desc").addEventListener("click", writeDescription);
document.getElementById("save-num").addEventListener("click", writeAssetNum);


const container = document.getElementById("main");
container.addEventListener('click', (event) => {
    let icon = event.target.getElementsByClassName("material-icons");
    if (icon[0]?.innerHTML === "expand_less") {
        icon[0].innerHTML = "expand_more";
    } else if (icon[0]?.innerHTML === "expand_more") {
        icon[0].innerHTML = "expand_less";
    } /* else {
        console.log('no icon found');
        console.log(icon);
    } */
})

function writeDescription() {
    const valid = new Validate;
    let field = document.getElementById("interact-desc");
    let desc = field.value.split(',');
    let path = document.getElementById("worksheet-path").innerHTML;
    let wsName = document.getElementById("ws-name").value;
    let rowNum = document.getElementById("current-row").innerHTML;
    let cols = document.getElementById("output-col").value.split(',');
    desc = valid.assembleDescription(desc);
    const worker = new WorkerHandler;
    worker.work(['writeDesc', [path, wsName, rowNum, cols, desc]], writeComplete);
}

function writeAssetNum() {
    let num = document.getElementById("interact-num").value;
    let path = document.getElementById("worksheet-path").innerHTML;
    let wsName = document.getElementById("ws-name").value;
    let rowNum = document.getElementById("current-row").innerHTML;
    let cols = document.getElementById("output-col").value.split(',');
    const worker = new WorkerHandler;
    worker.work(['writeNum', [path, wsName, rowNum, cols, num]], writeComplete);
}

function writeComplete() {
    let rowNum = parseInt(document.getElementById("current-row").innerHTML);
    new Toast(`Row ${rowNum} saved!`);
    document.getElementById("interact-num").value = '';
    interactiveGoNext(rowNum + 1);
}

function openFile() {
    const validFile = document.getElementById("valid-file");
    const filePath = validFile.innerText;
    if (filePath.length > 0) {
        shell.openExternal(filePath);
    }
}

function openSettings() {
    ipcRenderer.sendSync('openSettings');
}

function openExcel(mode) {
    dialog.showOpenDialog([], {
        title: "Select Spreadsheet with Names",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            const worker = new WorkerHandler;
            const params = [
                document.getElementById("ws-name").value,
                document.getElementById("input-col").value,
                document.getElementById("start-row").value,
                document.getElementById("output-col").value,
            ]
            if (mode===1) {
                worker.work(['interactive', result.filePaths, params], interactiveGoNext);
                document.getElementById("worksheet-path").innerHTML = result.filePaths[0];
            }
            
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function checkAgain() {
    let field = document.getElementById("interact-desc");
    const worker = new WorkerHandler;
    worker.work(['validSingle', field.value], interactiveShow);
}

async function interactiveGoNext(row) {
    if (!Number.isInteger(row)) {
        row = row[0]
    }
    const db = new Database();
    let description = await db.getDescription(row);
    let rowNum = document.getElementById("current-row");
    rowNum.innerHTML = row;
    const worker = new WorkerHandler;
    worker.work(['validSingle', description.description], interactiveShow);
    // write this
}

function interactiveShow(result) {
    let field = document.getElementById("interact-desc");
    field.value = result[0][3];
    findRelated(result[0]);
}

function validBatch() {
    dialog.showOpenDialog([], {
        title: "Select Spreadsheet with Names",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            const worker = new WorkerHandler;
            worker.work(['validBatch', result.filePaths], validBatchCB);
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function validBatchCB(data) {
    new Toast(`Batch Validation Finished!`);
    const fileLink = document.getElementById('valid-file');
    fileLink.innerText = data[0];
}


function triplePaste() {
    let paste = clipboard.readText();
    if (!paste) {
        new Toast('No content');
    }
    let descs = paste.split('	'); //excel uses that char for delimiting cells
    document.getElementById('main-desc').value = descs[0];
    document.getElementById('ext-desc-1').value = descs[1];
    document.getElementById('ext-desc-2').value = descs[2];
}

function validSingle() {
    let bar = new ProgressBar;
    bar.update(0, 'Starting Item Description Validation');
    let raw_desc = document.getElementById("maximo-desc").value;
    const worker = new WorkerHandler;
    worker.work(['validSingle', raw_desc], showResult);
}

function validTriple() {
    let desc = [];
    let content = '';
    content = document.getElementById('main-desc').value;
    desc.push(content);
    content = document.getElementById('ext-desc-1').value;
    desc.push(content);
    content = document.getElementById('ext-desc-2').value;
    desc.push(content);
    const worker = new WorkerHandler;
    worker.work(['validTriple', desc], showResult);
}

function showResult(result) {
    let triDesc = document.getElementById('result-triple-main');
    triDesc.innerHTML = result[0][0];
    triDesc = document.getElementById('result-triple-ext1');
    triDesc.innerHTML = result[0][1];
    triDesc = document.getElementById('result-triple-ext2');
    triDesc.innerHTML = result[0][2];
    triDesc = document.getElementById('result-single');
    triDesc.innerHTML = result[0][3];
    triDesc = new bootstrap.Collapse(document.getElementById('verified-table'), { toggle: false });
    triDesc.show();
    findRelated(result[0]);
}

function findRelated(result) {
    const worker = new WorkerHandler;
    worker.work(['findRelated', result[3]], showRelated);
}


async function showRelated(result) {
    let bar = new ProgressBar;
    if (!result[0]) {
        bar.update(100, 'Done!');
        return false;
    }
    const scores = result[0];
    const itemNames = result[1];
    const searchWords = result[2].split(',');
    let html = '';
    let itemName;
    bar.update(90, 'Generating table for showing related assets');
    const option = {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    };
    const formatter = new Intl.NumberFormat("en-US", option);
    for (let [key, value] of Object.entries(scores)) {
        let color = '';
        for (let item of value) {
            itemName = itemNames[item]
            if (itemName) {
                for (let word of searchWords) {
                    itemName = itemName.replace(new RegExp(`${word}`, 'i'), `<b>${word}</b>`)
                }
                if (key > 0.7) {
                    color = 'table-success';
                } else if (key > 0.4) {
                    color = 'table-warning';
                } else {
                    color = 'table-danger'
                }
                html = `${html}\n<tr class="${color}"><td>${formatter.format(key)}</td>\n<td>${item}</td>\n<td>${itemName}</td></tr>`
            } else {
                html = `<tr class="table-danger"><td>0</td>\n<td>xxxxxxx</td>\n<td>No Related Items Found</td></tr>`
            }
        }
    }
    const relatedTable = document.getElementById('related-items')
    relatedTable.innerHTML = html;
    html = new bootstrap.Collapse(document.getElementById('related-table'), { toggle: false });
    html.show();
    bar.update(100, 'Done!');
}

function copyResult(copy) {
    if (copy === 'single') {
        let content = document.getElementById('result-single').innerText;
        clipboard.writeText(content);
        new Toast('Single Description Copied to Clipboard!');
    } else {
        let desc = [];
        let content = '';
        content = document.getElementById('result-triple-main').innerText;
        desc.push(content);
        content = document.getElementById('result-triple-ext1').innerText;
        desc.push(content);
        content = document.getElementById('result-triple-ext2').innerText;
        desc.push(content);
        clipboard.write({
            text: document.getElementById('result-single').innerText,
            html: `<table><tbody><tr><td>${desc[0]}</td><td>${desc[1]}</td><td>${desc[2]}</td></tr></tbody></table>`,
        });
        new Toast('Triple Description Copied to Clipboard!');
    }
}


class WorkerHandler {
    async work(params, callback) {
        const worker = new Worker('./worker.js');
        worker.postMessage(params);
        worker.onmessage = (e) => {
            let log = new Logging();
            if (e.data[0] === 'result') {
                worker.terminate()
                callback(e.data.slice(1,));
            } else if (e.data[0] === 'error') {
                new Toast(e.data[1], 'bg-danger');
                let bar = new ProgressBar;
                bar.update(100, e.data[1]);
                log.error(e.data[1]);
                worker.terminate()
            } else if (e.data[0] === 'progress') {
                let bar = new ProgressBar;
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
            } else {
                console.log('unimplemented worker message');
                console.log(e);
            }
        }
    }
}

class Logging {
    constructor() {
        this.logTable = document.getElementById("logs-table")
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
        row.classList.add("table-info");
    }
}

class ProgressBar {
    constructor() {
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
        let regx = new RegExp('\\b' + 'bg-' + '[^ ]*[ ]?\\b', 'g');
        this.progressBar.className = this.progressBar.className.replace(regx, color);
    }

    addProgressBar(percent, message = null) {
        this.update(percent + this.currentProgress, message)
    }

    getProgress() {
        return {
            'percent': this.currentProgress,
            'message': this.progressText.innerText
        }
    }
}

class Toast {
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
        })
    }
}

function toTop() {
    let element = document.getElementsByClassName("flex-shrink-0")
    element[0].scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function toEnd() {
    let element = document.getElementsByClassName("flex-shrink-0")
    element[0].scrollTop = element[0].scrollHeight; // For Chrome, Firefox, IE and Opera
}
