const { dialog } = require('electron').remote
const ObservationDatabase = require('../assets/better-sqlite');

// Debug stuff
// document.getElementById("selected_output").innerHTML = 'C:\\Users\\majona\\Documents\\observationList\\results.xlsx'
// document.getElementById("selected_jobtasks").innerHTML = `C:\\Users\\majona\\Documents\\observationList\\Book1.xlsx`
// document.getElementById("selected_file").innerHTML = 'C:\\Users\\majona\\Documents\\observationList\\Failure Code Building.xlsm'
// document.getElementById("ws-name").value = 'ObservationList'

document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);

document.getElementById("select_file").addEventListener("click", selectFile);
document.getElementById("select_jobtasks").addEventListener("click", selectJobTasks);
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

function selectJobTasks() {
    dialog.showOpenDialog([], {
        title: "Select JobTasks List Spreadsheet",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            document.getElementById("selected_jobtasks").innerHTML = result.filePaths[0];
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function selectFolder() {
    dialog.showSaveDialog([], {
        title: "Save as",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb'] },
        ]
    }).then(result => {
        if (!result.canceled) {
            document.getElementById("selected_output").innerHTML = result.filePath;
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function processFile() {
    //getMaximoData();
    let bar = new ProgressBar;
    bar.update(0, 'Processing Spreadsheet');
    const worker = new WorkerHandler;
    const ws_name = document.getElementById("ws-name").value;
    const wb_path = document.getElementById("selected_file").innerHTML;
    worker.work(['processObservationList', [wb_path, ws_name]], saveReadObserves);
}

function saveReadObserves(data) {
    const sqlite = new ObservationDatabase();
    sqlite.createTables();
    sqlite.insertMeter(data[0][0]);
    sqlite.insertObservation(data[0][1]);
    getMaximoData();
}

function getMaximoData() {
    let bar = new ProgressBar;
    bar.update(33, 'Getting Data From Maximo');
    const worker = new WorkerHandler;
    worker.work(['getMaximoObservation'], compareObservLists);
}

function compareObservLists(data) {
    let bar = new ProgressBar;
    bar.update(66, 'Comparing Data');
    const worker = new WorkerHandler;
    const save_path = document.getElementById("selected_output").innerHTML;
    const jobTaskPath = document.getElementById("selected_jobtasks").innerHTML;
    worker.work(['compareObservLists', data[0], save_path, jobTaskPath], compareDone);
}

function compareDone() {
    let bar = new ProgressBar;
    bar.update(100, 'Done');
    new Toast('Done');
}