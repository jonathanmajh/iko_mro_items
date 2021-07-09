const ipc = require('electron').ipcRenderer;
const fs = require('fs')



function openObserveTemp() {
    ipc.send('start_observation_template', 'finished');
}

function openItem() {
    ipc.send('start_item_module', 'finished');
}

function openItemTranslation() {
    ipc.send('start_item_translate', 'finished');
}

document.getElementById("openObserveTemp").addEventListener("click", openObserveTemp);
document.getElementById("openItem").addEventListener("click", openItem);
document.getElementById("openItemTranslation").addEventListener("click", openItemTranslation);