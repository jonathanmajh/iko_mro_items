const {ipcRenderer} = require('electron');

function openObserveTemp() {
    ipcRenderer.send('start_observation_template', 'finished');
}

function openItem() {
    ipcRenderer.send('start_item_module', 'finished');
}

function openItemTranslation() {
    ipcRenderer.send('start_item_translate', 'finished');
}

function openAssetDescription() {
    ipcRenderer.send('start_asset_translate', 'finished');
}

document.getElementById("openObserveTemp").addEventListener("click", openObserveTemp);
document.getElementById("openItem").addEventListener("click", openItem);
document.getElementById("openItemTranslation").addEventListener("click", openItemTranslation);
document.getElementById("openAssetDescription").addEventListener("click", openAssetDescription);