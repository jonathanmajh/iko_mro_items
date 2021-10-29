const { dialog } = require('electron').remote

// Debug stuff
document.getElementById("selected_file").innerHTML = 'C:\\Users\\majona\\Documents\\GitHub\\iko_mro_items\\assets\\Translation_PM_JP_Asset.xlsx'
document.getElementById("selected_jobtasks").innerHTML = `C:\\Users\\majona\\Documents\\jp_pm_translation-test.xlsx`

document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);

document.getElementById("select_file").addEventListener("click", selectFile);
document.getElementById("select_jobtasks").addEventListener("click", selectJobTasks);
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
        title: "Select List of Job Plan & PMs Spreadsheet",
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


function processFile() {
    //getMaximoData();
    let bar = new ProgressBar;
    bar.update(0, 'Processing Spreadsheet');
    const worker = new WorkerHandler;
    const wb_translation = document.getElementById("selected_file").innerHTML;
    const wb_pms = document.getElementById("selected_jobtasks").innerHTML;
    worker.work([
        'translatepms',
        {wb_translation: wb_translation,
         wb_pms: wb_pms,
         siteid: 'COM',
         langcode: 'FR'}],
        showResults);
}

function showResults(results) {
    //todo
}
