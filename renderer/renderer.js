// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { clipboard, ipcRenderer, shell } = require('electron')
const { dialog } = require('electron').remote
const Database = require('../assets/indexDB')

document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("valid-triple").addEventListener("click", validTriple);
document.getElementById("batch-file").addEventListener("click", validBatch);
document.getElementById("template-file").addEventListener("click", test);
document.getElementById("single-copy").addEventListener("click", () => { copyResult('single') });
document.getElementById("triple-copy").addEventListener("click", () => { copyResult('triple') });
document.getElementById("triple-paste").addEventListener("click", triplePaste);
document.getElementById("valid-file").addEventListener("click", openFile);
document.getElementById("settings").addEventListener("click", openSettings);

const container = document.getElementById("main");
container.addEventListener('click', (event) => {
    let icon = event.target.getElementsByClassName("material-icons");
    if (icon[0]?.innerHTML === "expand_less") {
        icon[0].innerHTML = "expand_more";
    } else if (icon[0]?.innerHTML === "expand_more") {
        icon[0].innerHTML = "expand_less";
    } else {
        console.log('no icon found');
        console.log(icon);
    }
})

function openFile() {
    const validFile = document.getElementById("valid-file");
    const filePath = validFile.innerText;
    if (filePath.length > 0) {
        shell.openExternal(filePath);
    }
}

function openSettings() {
    console.log("opening settings");
    ipcRenderer.sendSync('openSettings');
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
            console.log(result.filePaths);
            const worker = new Worker('./worker.js');
            worker.postMessage(['validBatch', result.filePaths]);
            worker.onmessage = function (e) {
                console.log('message from worker');
                if (e.data[0] === 'result') {
                    new Toast(`Batch Validation Finished!`);
                    const fileLink = document.getElementById('valid-file');
                    fileLink.innerText = e.data[1];
                } else {
                    console.log('unimplemented worker message');
                }
                console.log(e);
            }
        } else {
            console.log('file picker cancelled');
        }
    })
}


function triplePaste() {
    let paste = clipboard.readText();
    console.log(clipboard.readHTML());
    console.log(clipboard.readText());
    if (!paste) {
        new Toast('No content');
    }
    let descs = paste.split('	'); //excel uses that char for delimiting cells
    console.log(descs);
    document.getElementById('main-desc').value = descs[0];
    document.getElementById('ext-desc-1').value = descs[1];
    document.getElementById('ext-desc-2').value = descs[2];
}

function validSingle() {
    let raw_desc = document.getElementById("maximo-desc").value;
    const worker = new Worker('./worker.js');
    worker.postMessage(['validSingle', raw_desc]);
    worker.onmessage = function (e) {
        console.log('message from worker');
        if (e.data[0] === 'result') {
            showResult(e.data[1]);
        } else {
            console.log('unimplemented worker message');
        }
        console.log(e);
    }
}

function validTriple() {
    const worker = new Worker('./worker.js');
    let desc = [];
    let content = '';
    content = document.getElementById('main-desc').value;
    desc.push(content);
    content = document.getElementById('ext-desc-1').value;
    desc.push(content);
    content = document.getElementById('ext-desc-2').value;
    desc.push(content);
    worker.postMessage(['validTriple', desc]);
    worker.onmessage = (e) => {
        if (e.data[0] === 'result') {
            showResult(e.data[1]);
        } else {
            console.log('unimplemented worker message');
        }
        console.log(e);
    }
}

function showResult(result) {
    let triDesc = document.getElementById('result-triple-main');
    triDesc.innerHTML = result[0];
    triDesc = document.getElementById('result-triple-ext1');
    triDesc.innerHTML = result[1];
    triDesc = document.getElementById('result-triple-ext2');
    triDesc.innerHTML = result[2];
    triDesc = document.getElementById('result-single');
    triDesc.innerHTML = result[3];
    triDesc = new bootstrap.Collapse(document.getElementById('verified-table'), { toggle: false });
    triDesc.show();
    findRelated(result);
}

function findRelated(result) {
    const worker = new Worker('./worker.js');
    worker.postMessage(['findRelated', result[3]]);
    worker.onmessage = (e) => {
        if (e.data[0] === 'result') {
            showRelated(e.data.slice(1,), result[3]);
        } else if (e.data[0] === 'error') {
            let msgs = e.data.slice(1,);
            for (let i = 0; i < msgs.length; i++) {
                new Toast(msgs[i]);
            }
            let bar = new ProgressBar;
            bar.update(100, msgs[0]);
        } else {
            console.log('unimplemented worker message');
        }
        console.log(e);
    }
}


async function showRelated(result, searchWords) {
    const scores = result[0];
    const itemNames = result[1];
    searchWords = searchWords.split(',');
    let html = '';
    let itemName;
    const option = {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    };
    const formatter = new Intl.NumberFormat("en-US", option);
    for (let [key, value] of Object.entries(scores)) {
        console.log(key, value);
        for (let item of value) {
            itemName = itemNames[item]
            for (let word of searchWords) {
                itemName = itemName.replace(new RegExp(`${word}`, 'i'), `<b>${word}</b>`)
            }
            html = `${html}\n<tr><td>${formatter.format(key)}</td>\n<td>${item}</td>\n<td>${itemName}</td></tr>`
        }

    }
    const relatedTable = document.getElementById('related-items')
    relatedTable.innerHTML = html;
    html = new bootstrap.Collapse(document.getElementById('related-table'), { toggle: false });
    html.show();
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


// class WorkerHandler {
//     async work(params) {
//         const worker = new Worker('./worker.js');
//         worker.postMessage(params);
//         worker.onmessage = (e) => {
//             if (e.data[0] === 'result') {
//                 return(e.data.slice(1,));
//             } else if (e.data[0] === 'error') {
//                 let msgs = e.data.slice(1,);
//                 for (let i=0; i<msgs.length; i++) {
//                     new Toast(msgs[i]);
//                 }
//                 let bar = new ProgressBar;
//                 bar.update(100, msgs[0]);
//                 return false;
//             } else {
//                 console.log('unimplemented worker message');
//             }
//             console.log(e);
//         }
//     }
// }

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

    update(percent, message) {
        this.updateProgressBar(percent);
        if (message) {
            this.progressText.innerText = message;
        }
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
    constructor(newMessage = null) {
        this.toastContainer = document.getElementById('toastPlacement');
        if (newMessage) {
            this.newToast(newMessage);
        }
    }

    newToast(message) {
        let toast = document.createElement('div');
        toast.setAttribute('class', "toast d-flex align-items-center border-0");
        toast.innerHTML = `<div class="toast-body">${message}</div><button type="button" class="btn-close ms-auto me-2" data-bs-dismiss="toast"></button>`;
        let bsToast = new bootstrap.Toast(toast);
        this.toastContainer.appendChild(toast);
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', (e) => {
            e.target.remove();
        })
    }
}

function test() {
    let db = new Database();
}