// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { ipcRenderer } = require('electron')
const worker = new Worker('./worker.js')

document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("valid-triple").addEventListener("click", progress);
document.getElementById("batch-file").addEventListener("click", test);
document.getElementById("single-input").addEventListener("hide.bs.collapse", stub);
document.getElementById("batch-input").addEventListener("hide.bs.collapse", stub);
document.getElementById("single-input").addEventListener("show.bs.collapse", stub);
document.getElementById("batch-input").addEventListener("show.bs.collapse", stub);

function stub() {
    console.log('stub function')
    // ipcRenderer.invoke('updateManufacturer', 'some arg')
}

function validSingle() {
    let raw_desc = document.getElementById("maximo-desc").value;
    worker.postMessage(['validSingle', raw_desc]);
    worker.onmessage = function(e) {
        console.log('message from worker')
        console.log(e);
    }
}

async function test() {
    worker.postMessage(['test', 1, 2, 3]);
    console.log('send message to worker');
}

async function progress() {
    let percent = document.getElementById("main-desc");
    let message = document.getElementById("ext-desc-1");
    worker.postMessage(['progress', percent.value, message.value]);
    console.log('send message to worker');
    worker.onmessage = function(e) {
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
        this.currentProgress = this.currentProgress.slice(7, this.currentProgress.length-2);
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

    addProgressBar(percent, message=null) {
        this.update(percent+this.currentProgress, message)
    }

    getProgress() {
        return {
            'percent': this.currentProgress,
            'message': this.progressText.innerText
        }
    }
}