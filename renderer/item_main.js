const { clipboard, ipcRenderer, shell } = require('electron')
const { dialog } = require('electron').remote
const Database = require('../assets/indexDB')
const Validate = require('../assets/validators')

document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("single-copy").addEventListener("click", () => { copyResult('single') });
document.getElementById("triple-copy").addEventListener("click", () => { copyResult('triple') });
document.getElementById("triple-paste").addEventListener("click", triplePaste);
document.getElementById("valid-file").addEventListener("click", openFile);
document.getElementById("settings").addEventListener("click", openSettings);
document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);
document.getElementById("interactive").addEventListener("click", () => { openExcel(1) });

document.getElementById("recheck-desc").addEventListener("click", checkAgain);
document.getElementById("save-desc").addEventListener("click", writeDescription);
document.getElementById("save-num").addEventListener("click", writeAssetNum);
document.getElementById("skip-row").addEventListener("click", skipRow);

// listener for enter key on search field
document.getElementById("maximo-desc").addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      validSingle();
    }
  });

// listener for general click events on icons
document.getElementById("main").addEventListener('click', (event) => {
    let icon;
    if (event.target.classList.contains("material-icons")) {
        icon = [event.target];
    } else {
        icon = event.target.getElementsByClassName("material-icons");
    }
    if (icon[0]?.innerText === "expand_less") {
        icon[0].innerText = "expand_more";
    } else if (icon[0]?.innerText === "expand_more") {
        icon[0].innerText = "expand_less";
    } else if (icon[0]?.innerText === "add_task") {
        console.log(icon)
    } else {
        console.log('no icon found');
        //console.log(icon);
    }
})

function writeDescription() {
    const valid = new Validate;
    let field = document.getElementById("maximo-desc");
    if (field.value.length > 0) {
        let bar = new ProgressBar;
        bar.update(0, 'Writing asset description to file');
        let desc = field.value.split(',');
        desc = valid.assembleDescription(desc);
        let params = worksheetParams();
        params.outRow = document.getElementById("current-row").innerHTML;
        const worker = new WorkerHandler;
        worker.work(['writeDesc', [params, desc]], writeComplete);
    } else {
        new Toast('Please enter a valid description');
    }
}

function worksheetParams(path = false) {
    let params = {
        wsName: "Sheet1", //document.getElementById("ws-name").value, // name of ws
        inDesc: "B,C,D".split(','), //document.getElementById("input-col").value, // description columns for input
        startRow: "10", //document.getElementById("start-row").value, // starting row of ws
        outDesc: "M,N,O,P".split(','), //document.getElementById("output-col").value, // output columns for description (3)
        inComm: "E", // commodity group in
        inGL :"F", //gl class in
        inUOM: "G", // uom in
        outComm: "R", // commodity group out
        outGL: "S", // gl class out
        outUOM: "T", // uom out
        outQuestion: "U", // questions out
        outRow: 0,
    }
    if (path) {
        params.filePath = path;
    } else {
        params.filePath = document.getElementById("worksheet-path").innerHTML
    }
    return params
}

function writeAssetNum() {
    let num = document.getElementById("interact-num").value;
    if (num.length > 0) {
        let bar = new ProgressBar;
        bar.update(0, 'Writing asset number to file');
        let path = document.getElementById("worksheet-path").innerHTML;
        let wsName = document.getElementById("ws-name").value;
        let rowNum = document.getElementById("current-row").innerHTML;
        let cols = document.getElementById("output-col").value.split(',');
        const worker = new WorkerHandler;
        worker.work(['writeNum', [path, wsName, rowNum, cols, num]], writeComplete);
    } else {
        new Toast('Please enter a valid item number');
    }

}

function writeComplete() {
    let rowNum = parseInt(document.getElementById("current-row").innerHTML);
    new Toast(`Row ${rowNum} saved!`);
    document.getElementById("interact-num").value = '';
    interactiveGoNext(rowNum + 1);
}

function openFile() {
    const validFile = document.getElementById("valid-file");
    const filePath = validFile.innerText;
    if (filePath.length > 0) {
        shell.openExternal(filePath);
    }
}

function openSettings() {
    ipcRenderer.sendSync('openSettings');
}

function openExcel(mode) {
    // capitalize columns
    document.getElementById("input-col").value = document.getElementById("input-col").value.toUpperCase();
    document.getElementById("output-col").value = document.getElementById("output-col").value.toUpperCase();

    dialog.showOpenDialog([], {
        title: "Select Spreadsheet with Names",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            const worker = new WorkerHandler;
            const params = worksheetParams(result.filePaths[0]);
            if (mode === 1) {
                worker.work(['interactive', params], interactiveGoNext);
                document.getElementById("worksheet-path").innerHTML = result.filePaths[0];
            }

        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function checkAgain() {
    let field = document.getElementById("interact-desc");
    const worker = new WorkerHandler;
    worker.work(['validSingle', field.value], interactiveShow);
}

function skipRow() {
    let row = document.getElementById("current-row").innerHTML
    interactiveGoNext(Number(row) + 1)
}

async function interactiveGoNext(row) {
    if (!Number.isInteger(row)) {
        row = row[0]
    }
    const db = new Database();
    let description = await db.getDescription(row);
    let rowNum = document.getElementById("current-row");
    rowNum.innerHTML = row;
    if (description) {
        const worker = new WorkerHandler;
        worker.work(['validSingle', description.description], interactiveShow);
    } else {
        let field = document.getElementById("interact-desc");
        field.placeholder = "Row is blank, press skip row to go next";
        field.value = "";
        let bar = new ProgressBar;
        bar.update(100, 'Done');
    }
}

function interactiveShow(result) {
    let field = document.getElementById("maximo-desc");
    field.value = result[0][3];
    field.placeholder = "";
    findRelated(result[0]);
}

function validBatch() {
    dialog.showOpenDialog([], {
        title: "Select Spreadsheet with Names",
        filters: [
            { name: 'Spreadsheet', extensions: ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'] },
        ],
        properties: [
            'openFile'
        ]
    }).then(result => {
        if (!result.canceled) {
            const worker = new WorkerHandler;
            worker.work(['validBatch', result.filePaths], validBatchCB);
        } else {
            new Toast('File Picker Cancelled');
        }
    })
}

function validBatchCB(data) {
    new Toast(`Batch Validation Finished!`);
    const fileLink = document.getElementById('valid-file');
    fileLink.innerText = data[0];
}


function triplePaste() {
    let paste = clipboard.readText();
    if (!paste) {
        new Toast('No content');
    }
    let descs = paste.split('	'); //excel uses that char for delimiting cells
    document.getElementById('main-desc').value = descs[0];
    document.getElementById('ext-desc-1').value = descs[1];
    document.getElementById('ext-desc-2').value = descs[2];
}

function validSingle() {
    let bar = new ProgressBar;
    bar.update(0, 'Starting Item Description Validation');
    let raw_desc = document.getElementById("maximo-desc").value;
    const worker = new WorkerHandler;
    worker.work(['validSingle', raw_desc], showResult);
}

function validTriple() {
    let desc = [];
    let content = '';
    content = document.getElementById('main-desc').value;
    desc.push(content);
    content = document.getElementById('ext-desc-1').value;
    desc.push(content);
    content = document.getElementById('ext-desc-2').value;
    desc.push(content);
    const worker = new WorkerHandler;
    worker.work(['validTriple', desc], showResult);
}

function showResult(result) {
    let triDesc = document.getElementById('result-triple-main');
    triDesc.innerHTML = result[0][0];
    triDesc = document.getElementById('result-triple-ext1');
    triDesc.innerHTML = result[0][1];
    triDesc = document.getElementById('result-triple-ext2');
    triDesc.innerHTML = result[0][2];
    triDesc = document.getElementById('result-single');
    triDesc.innerHTML = result[0][3];
    triDesc = new bootstrap.Collapse(document.getElementById('verified-table'), { toggle: false });
    triDesc.show();
    findRelated(result[0]);
}

function findRelated(result) {
    const worker = new WorkerHandler;
    worker.work(['findRelated', result[3]], showRelated);
}


async function showRelated(result) {
    let bar = new ProgressBar;
    if (!result[0]) {
        bar.update(100, 'Done!');
        return false;
    }
    const scores = result[0];
    const itemNames = result[1];
    const searchWords = result[2].split(',');
    let html = '';
    let itemName;
    bar.update(90, 'Generating table for showing related assets');
    const option = {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    };
    const formatter = new Intl.NumberFormat("en-US", option);
    for (let [key, value] of Object.entries(scores)) {
        let color = '';
        for (let item of value) {
            itemName = itemNames[item][0]
            if (itemName) {
                for (let word of searchWords) {
                    split = word.split(' ');
                    for (let smallWord of split) {
                        if (smallWord.length > 0) {
                            itemName = itemName.replace(
                                new RegExp(`${smallWord}`, 'i'),
                                `<b>${itemName.match(new RegExp(`${smallWord}`, 'i'))?.[0]}</b>`
                                )
                        }
                    }

                }
                if (key > 0.7) {
                    color = 'table-success';
                } else if (key > 0.4) {
                    color = 'table-warning';
                } else {
                    color = 'table-danger'
                }
                html = `${html}\n<tr class="${color}"><td>${formatter.format(key)}</td>
                <td>${item}</td>
                <td>${itemName}</td>
                <td>${itemNames[item][2]}</td>
                <td>${itemNames[item][3]}</td>
                <td>${itemNames[item][1]}</td>
                <td><i class="material-icons pointer sm-size"> add_task</i></td></tr>`
            } else {
                html = `<tr class="table-danger"><td>0</td>\n<td>xxxxxxx</td>\n<td>No Related Items Found</td></tr>`
            }
        }
    }
    const relatedTable = document.getElementById('related-items')
    relatedTable.innerHTML = html;
    html = new bootstrap.Collapse(document.getElementById('related-table'), { toggle: false });
    html.show();
    bar.update(100, 'Done!');
}

function copyResult(copy) {
    if (copy === 'single') {
        let content = document.getElementById('result-single').innerText;
        clipboard.writeText(content);
        new Toast('Single Description Copied to Clipboard!');
    } else {
        let desc = [];
        let content = '';
        content = document.getElementById('result-triple-main').innerText;
        desc.push(content);
        content = document.getElementById('result-triple-ext1').innerText;
        desc.push(content);
        content = document.getElementById('result-triple-ext2').innerText;
        desc.push(content);
        clipboard.write({
            text: document.getElementById('result-single').innerText,
            html: `<table><tbody><tr><td>${desc[0]}</td><td>${desc[1]}</td><td>${desc[2]}</td></tr></tbody></table>`,
        });
        new Toast('Triple Description Copied to Clipboard!');
    }
}