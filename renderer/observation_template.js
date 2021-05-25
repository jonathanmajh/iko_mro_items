const { dialog } = require('electron').remote

document.getElementById("select_file").addEventListener("click", selectFile);
document.getElementById("select_output").addEventListener("click", selectFolder);
document.getElementById("process").addEventListener("click", processFile);

function selectFile() {
    dialog.showOpenDialog([], {
        title: "Select Observation List Spreadsheet",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            document.getElementById("selected_file").innerHTML = result.filePaths[0];
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function selectFolder() {
    dialog.showOpenDialog([], {
        title: "Select Folder to Save Templates to",
        properties: [
            'openDirectory'
        ]
    }).then(result => {
        if (!result.canceled) {
            document.getElementById("selected_output").innerHTML = result.filePaths[0];
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function processFile() {
    const worker = new WorkerHandler;
    const ws_name = document.getElementById("ws-name").value;
    const wb_path = document.getElementById("selected_file").innerHTML;
    worker.work(['processObservationList', [wb_path, ws_name]]);
}