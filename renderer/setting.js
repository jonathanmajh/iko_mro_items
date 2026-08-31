const { ipcRenderer } = require('electron');

document.getElementById("update-trans").addEventListener("click", updateTranslation);

function updateTranslation() {
    ipcRenderer.invoke('select-to-be-translated', 'finished').then((result) => {
        if (!result.canceled) {
            const worker = new Worker('./worker.js');
            worker.postMessage(['refreshTranslations', result.filePaths[0]], complete);
        }
    });
}

function complete(data) {
    console.log(data);
    console.log('complete');
}