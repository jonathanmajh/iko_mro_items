const { clipboard, ipcRenderer, shell } = require('electron');
// const { dialog } = require('electron').remote;
const Database = require('../assets/indexDB');
const Validate = require('../assets/validators');

document.getElementById("load-item").addEventListener("click", loadItem);
document.getElementById("valid-single").addEventListener("click", validSingle);
document.getElementById("single-copy").addEventListener("click", () => { copyResult('single'); });
document.getElementById("triple-copy").addEventListener("click", () => { copyResult('triple'); });
document.getElementById("triple-paste").addEventListener("click", triplePaste);
document.getElementById("valid-file").addEventListener("click", openFile);
document.getElementById("settings").addEventListener("click", openSettings);
document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);
document.getElementById("interactive").addEventListener("click", openExcel);

document.getElementById("recheck-desc").addEventListener("click", checkAgain);
document.getElementById("save-desc").addEventListener("click", writeDescription);
document.getElementById("save-num").addEventListener("click", writeAssetNum);
document.getElementById("skip-row").addEventListener("click", skipRow);
document.getElementById("open-in-browser").addEventListener("click", openBrowser);

// listener for enter key on search field
document.getElementById("maximo-desc").addEventListener("keyup", function (event) {
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
        console.log(icon);
    } else {
        console.log('no icon found');
        //console.log(icon);
    }
});

function loadItem() {
    const worker = new WorkerHandler();
    worker.work(['loadItem', document.getElementById("interact-num").value], showItem);
}

function openBrowser() {
    const worker = new WorkerHandler();
    worker.work(['getNextItemNumber'], openBrowserLink);
}

function openBrowserLink(info) {
    document.getElementById("popupAlertTitle").innerHTML = 'Generating Maximo Link...';
    document.getElementById("popupAlertBody").innerHTML = '<p>Getting New Item Number...</p>';
    let url = `http://nscandacmaxapp1.na.iko/maximo/ui/maximo.jsp?event=loadapp&value=item&additionalevent=insert&additionaleventvalue=description=${document.getElementById('result-single').innerHTML}`;
    if (info[0] === 0) {
        let number = info[1] + 1;
        document.getElementById("popupAlertBody").innerHTML = `<p>New Item Number is: ${number}</p>`;
        url = `${url}|itemnum=${number}`;
    } else {
        document.getElementById("popupAlertBody").innerHTML = `<p>Cannot get new item number...</p>\n<p>${info[1]}</p>`;
    }
    if (document.getElementById("uom-field").value.length > 0) {
        url = `${url}|ISSUEUNIT=${document.getElementById("uom-field").value}`;
    }
    if (document.getElementById("com-group").value.length > 0) {
        url = `${url}|COMMODITYGROUP=${document.getElementById("com-group").value}`;
    }
    if (document.getElementById("gl-class").value.length > 0) {
        url = `${url}|EXTERNALREFID=${document.getElementById("gl-class").value}`;
    }
    document.getElementById("popupAlertBody").innerHTML =
        `${document.getElementById("popupAlertBody").innerHTML}\n
    <p>Link Ready: <a id="maximo-link" href="${url}">Create Item In Maximo</a></p>\n
    <p>Remember to replace (&amp;quot;) in the description with (")</p>\n
    <p>This is a limitation of the current method</p>`;
    document.getElementById("maximo-link").addEventListener('click', function (e) {
        e.preventDefault();
        shell.openExternal(url);
    });
}

function showItem(data) {
    document.getElementById("maximo-desc").value = data[0].description;
    document.getElementById("uom-field").value = data[0].uom;
    document.getElementById("com-group").value = data[0].commodity_group;
    document.getElementById("gl-class").value = data[0].gl_class;
}

function writeDescription() {
    const valid = new Validate();
    let field = document.getElementById("maximo-desc");
    if (field.value.length > 0) {
        let bar = new ProgressBar();
        bar.update(0, 'Writing asset description to file');
        let desc = field.value.split(',');
        desc = valid.assembleDescription(desc);
        let params = worksheetParams();
        params.outRow = document.getElementById("current-row").innerHTML;
        const worker = new WorkerHandler();
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
        inGL: "F", //gl class in
        inUOM: "G", // uom in
        outComm: "R", // commodity group out
        outGL: "S", // gl class out
        outUOM: "T", // uom out
        outQuestion: "U", // questions out
        outRow: 0,
        outItemNum: "V",
        outItemDesc: "W",
        outTranslate: "Z",
        outMissing: "AA",
    };
    if (path) {
        params.filePath = path;
    } else {
        params.filePath = document.getElementById("worksheet-path").innerHTML;
    }
    return params;
}

function writeAssetNum() {
    let num = document.getElementById("interact-num").value;
    if (num.length > 0) {
        let bar = new ProgressBar();
        bar.update(0, 'Writing item number to file');
        let path = document.getElementById("worksheet-path").innerHTML;
        let wsName = document.getElementById("ws-name").value;
        let rowNum = document.getElementById("current-row").innerHTML;
        let cols = document.getElementById("output-col").value.split(',');
        const worker = new WorkerHandler();
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

function openExcel() {
    document.getElementById("input-col").value = document.getElementById("input-col").value.toUpperCase();
    document.getElementById("output-col").value = document.getElementById("output-col").value.toUpperCase();

    ipcRenderer.invoke('select-to-be-translated', 'finished').then((result) => {
        if (!result.canceled) {
            const worker = new WorkerHandler();
            const params = worksheetParams(result.filePaths[0]);
            worker.work(['interactive', params], interactiveGoNext);
            document.getElementById("worksheet-path").innerHTML = result.filePaths[0];
        } else {
            new Toast('File Picker Cancelled');
        }
    });
}

function checkAgain() {
    let field = document.getElementById("maximo-desc");
    const worker = new WorkerHandler();
    worker.work(['validSingle', field.value], interactiveShow);
}

function skipRow() {
    let row = document.getElementById("current-row").innerHTML;
    interactiveGoNext(Number(row) + 1);
}

function interactiveGoNext(row) {
    if (!Number.isInteger(row)) {
        row = row[0];
    }
    const db = new Database();
    let description = db.getDescription(row);
    document.getElementById("current-row").innerHTML = row;
    const interactive = document.getElementById("modeSelect").checked;
    if (description) {
        const worker = new WorkerHandler();
        if (interactive) {
            worker.work(['validSingle', description.description], interactiveShow);
        } else {
            const related = document.getElementById("relatedSelect").checked;
            const translate = document.getElementById("translateSelect").checked;
            const params = worksheetParams(document.getElementById("worksheet-path").innerHTML);
            worker.work([
                'nonInteractive',
                [
                    related, 
                    translate, 
                    description.description, 
                    document.getElementById('selected-language').value,
                    params,
                    row
                ]], 
                interactiveGoNext);
        }

    } else {
        let field = document.getElementById("maximo-desc");
        field.placeholder = "Row is blank, press skip row to go next";
        field.value = "";
        let bar = new ProgressBar();
        bar.update(100, 'Done');
    }
}

function interactiveShow(result) {
    let field = document.getElementById("maximo-desc");
    field.value = result[0][3];
    field.placeholder = "";
    calcConfidence(result[0][3]);
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
    let bar = new ProgressBar();
    bar.update(0, 'Starting Item Description Validation');
    let raw_desc = document.getElementById("maximo-desc").value;
    const worker = new WorkerHandler();
    worker.work(['validSingle', raw_desc], showResult);
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
    calcConfidence(result[0][3]);
    translationDescription(result[0][3]);
    findRelated(result[0]);
}

function findRelated(result) {
    const worker = new WorkerHandler();
    worker.work(['findRelated', result[3]], showRelated);
}

function translationDescription(description) {
    // for now do not translate if english is selected
    if (document.getElementById("selected-language").value != 'en') {
        // translate
    }
    const worker = new WorkerHandler();
    if (document.getElementById('result-triple-ext1').innerHTML) {
        description = `${document.getElementById('result-triple-main').innerHTML},${document.getElementById('result-triple-ext1').innerHTML}`;
    } else {
        description = document.getElementById('result-triple-main').innerHTML;
    }

    worker.work([
        'translateItem',
        description,
        document.getElementById('selected-language').value,
        'post'
    ], displayTranslation);
}

function displayTranslation(data) {
    document.getElementById('trans-desc').innerText = data[0];
    document.getElementById('translation-description').innerText = `The following words do not have a translation:\n${data[1]}\nPlease check logs at bottom of page for details`;
}

function calcConfidence(data) {
    let description;
    let level = 0;
    let tree = '';
    let parent = 0;
    const regex = /\d+/g;
    const db = new Database();
    let analysis;
    let result = '';
    const option = {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    };
    const formatter = new Intl.NumberFormat("en-US", option);

    if (data?.length > 0) { //test if description is blank
        description = data.split(',');
        for (let j = 0; j < description.length; j++) {
            if (!(description[j].match(regex))) {
                if (db.isManufacturer(description[j])) {
                    result = `${result}\n${description[j]} is confirmed as a manufacturer`;
                } else {
                    level++;
                    if (level == 1) {
                        tree = description[j];
                    } else {
                        tree = tree + ',' + description[j];
                    }
                    analysis = db.getAnalysis(tree);
                    if (analysis) {
                        if (level == 1) {
                            if (analysis.count >= 100) {
                                result = `${description[j]}: is COMMONLY used as an Item Type.\n${analysis.count}: occurrences found`;
                            } else if (analysis.count >= 20) {
                                result = `${description[j]}: is SOMETIMES used as an Item Type.\n${analysis.count}: occurrences found`;
                            } else {
                                result = `WARNING: ${description[j]}: is an UNCOMMON Item Type.\nPlease double check.\n${analysis.count}: occurrences found`;
                            }
                        } else {
                            if (analysis.count / parent >= 0.25) {
                                result = `${result}\n${description[j]} is COMMONLY used as an item descriptor for ${tree}.\n${analysis.count} of ${parent} = ${formatter.format(analysis.count / parent)}`;
                            } else if (analysis.count / parent >= 0.05) {
                                result = `${result}\n${description[j]} is SOMETIMES used as an item descriptor for ${tree}.\n${analysis.count} of ${parent} = ${formatter.format(analysis.count / parent)}`;
                            } else {
                                result = `${result}\n${description[j]} is an UNCOMMON item descriptor for ${tree}.\nPlease double check.\n${analysis.count} of ${parent} = ${formatter.format(analysis.count / parent)}`;
                            }
                        }
                        parent = analysis.count;
                    } else {
                        result = `${result}\n${description[j]}: Does not exist in Maximo as part of: ${tree}.\nPlease Check with Corporate`;
                    }
                }
            }
        }
        document.getElementById('valid-description').innerText = result.trim();
    } else {
        new Toast('Blank Description');
    }
}


async function showRelated(result) {
    let bar = new ProgressBar();
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
    // technically this is bad practise since object order might not be guarenteed 
    // https://stackoverflow.com/questions/983267/how-to-access-the-first-property-of-a-javascript-object
    for (let [key, value] of Object.entries(scores)) {
        let color = '';
        for (let item of value) {
            itemName = itemNames[item][0];
            if (itemName) {
                for (let word of searchWords) {
                    split = word.split(' ');
                    for (let smallWord of split) {
                        if (smallWord.length > 0) {
                            itemName = itemName.replace(
                                new RegExp(`${smallWord}`, 'i'),
                                `<b>${itemName.match(new RegExp(`${smallWord}`, 'i'))?.[0]}</b>`
                            );
                        }
                    }

                }
                if (key > 0.7) {
                    color = 'table-success';
                } else if (key > 0.4) {
                    color = 'table-warning';
                } else {
                    color = 'table-danger';
                }
                html = `${html}\n<tr class="${color}"><td>${formatter.format(key)}</td>
                <td>${item}</td>
                <td>${itemName}</td>
                <td>${itemNames[item][2]}</td>
                <td>${itemNames[item][3]}</td>
                <td>${itemNames[item][1]}</td>
                <td><i class="material-icons pointer sm-size"> add_task</i></td></tr>`;
            } else {
                html = `<tr class="table-danger"><td>0</td>\n<td>xxxxxxx</td>\n<td>No Related Items Found</td></tr>`;
            }
        }
    }
    const relatedTable = document.getElementById('related-items');
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