// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { ipcRenderer } = require('electron')

document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("valid-triple").addEventListener("click", stub);
document.getElementById("batch-file").addEventListener("click", stub);
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
    ipcRenderer.invoke('validSingle', raw_desc);
}