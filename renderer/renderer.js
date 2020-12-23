// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { ipcRenderer, clipboard } = require('electron')

document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("valid-triple").addEventListener("click", validTriple);
document.getElementById("batch-file").addEventListener("click", test);
document.getElementById("single-input").addEventListener("hide.bs.collapse", stub);
document.getElementById("single-input").addEventListener("show.bs.collapse", stub);
document.getElementById("batch-input").addEventListener("show.bs.collapse", stub);
document.getElementById("batch-input").addEventListener("hide.bs.collapse", stub);
document.getElementById("single-copy").addEventListener("click", () => { copyResult('single') });
document.getElementById("triple-copy").addEventListener("click", () => { copyResult('triple') });
document.getElementById("triple-paste").addEventListener("click", triplePaste);

function stub() {
    console.log('stub function')
    // ipcRenderer.invoke('updateManufacturer', 'some arg')
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
    triDesc.innerHTML = result.join();
    triDesc = new bootstrap.Collapse(document.getElementById('verified-table'), {toggle: false});
    triDesc.show()
}

async function test() {
    new Toast('toast message');
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

async function progress() {
    let percent = document.getElementById("main-desc");
    let message = document.getElementById("ext-desc-1");
    worker.postMessage(['progress', percent.value, message.value]);
    console.log('send message to worker');
    worker.onmessage = function (e) {
        console.log('message from worker')
        let progressBar = new ProgressBar();
        progressBar.update(e.data[0], e.data[1]);
        console.log(e)
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