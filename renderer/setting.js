const { dialog } = require('electron').remote

document.getElementById("update-manu").addEventListener("click", updateManuf);
document.getElementById("update-abbr").addEventListener("click", UpdateAbbre);

function updateManuf() {
    let result = update('manufacturer');
}

function UpdateAbbre() {
    let result = update('abbreviations');
}

function update(updateType) {
    dialog.showOpenDialog([], {
        title: "Select Spreadsheet with ".concat(updateType),
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            console.log(result.filePaths);
            const worker = new Worker('./worker.js');
            worker.postMessage(['update', updateType, result.filePaths[0]]);
            worker.onmessage = function (e) {
                console.log('message from worker');
                if (e.data[0] === 'result') {
                    // showResult(e.data[1]);
                } else {
                    console.log('unimplemented worker message');
                }
                console.log(e);
            }
        } else {
            console.log('file picker cancelled');
        }
    })
}