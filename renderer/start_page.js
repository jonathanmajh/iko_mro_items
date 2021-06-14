const ipc = require('electron').ipcRenderer;
const fs = require('fs')



function openObserveTemp() {
    ipc.send('start_observation_template', 'finished');
}

function openItem() {
    ipc.send('start_item_module', 'finished');
}

document.getElementById("openObserveTemp").addEventListener("click", openObserveTemp);
document.getElementById("openItem").addEventListener("click", openItem);