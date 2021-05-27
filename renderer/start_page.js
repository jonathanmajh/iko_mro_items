const ipc = require('electron').ipcRenderer;
const fs = require('fs')

if (fs.existsSync('./assets/obserlist.db')) {
    fs.unlink('./assets/obserlist.db', (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log('deleted old observation list db')
        }

    })
}

function openObserveTemp() {
    ipc.send('start_observation_template', 'finished');
}

function openItem() {
    ipc.send('start_item_module', 'finished');
}

document.getElementById("openObserveTemp").addEventListener("click", openObserveTemp);
document.getElementById("openItem").addEventListener("click", openItem);