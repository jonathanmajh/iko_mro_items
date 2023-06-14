const { clipboard, ipcRenderer, shell } = require('electron');
// const { dialog } = require('electron').remote;
const Database = require('../assets/indexDB');
const Validate = require('../assets/validators');
let itemsToUpload = [];
let colLoc = {
    description: -1,
    uom: -1,
    commGroup: -1,
    glClass: -1,
    maximo: -1,
}
let relatedResults = {
    idx: 0,
    curKey: 0,
    results: [],
}

window.onload = function() {
    document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
}

//Infinite scroll
document.getElementById("everything").addEventListener('scroll',()=>{
    //dont add items to the list if the accordion is collapsed
    if(document.getElementById("related-items-accordion-btn").classList.contains("collapsed") || relatedResults.results.length == 0){
        return;
    }
    
    let element = document.getElementById("related-items");

    let domRect = element.getBoundingClientRect();
    let spaceBelow = document.getElementById("everything").offsetHeight - domRect.bottom;
    //console.log(spaceBelow);
    if(spaceBelow>-100){
        //load more items if the bottom of the table is less than 100px below the bottom of the viewport
        loadRelated();
    }
})

document.getElementById("load-item").addEventListener("click", loadItem);
document.getElementById("valid-single").addEventListener("click", () => {validSingle()});
document.getElementById("valid-single-ext").addEventListener("click", () => {validSingle(true)});
document.getElementById("single-copy").addEventListener("click", () => { copyResult('single'); });
document.getElementById("triple-copy").addEventListener("click", () => { copyResult('triple'); });
document.getElementById("settings").addEventListener("click", openSettings);
document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);
document.getElementById("interactive").addEventListener("click", openExcel);
document.getElementById("worksheet-path").addEventListener("click", openExcel);
document.getElementById("pauseAuto").addEventListener("click", pauseAuto);

document.getElementById("save-desc").addEventListener("click", writeDescription);
document.getElementById("save-num").addEventListener("click", writeItemNum);
document.getElementById("skip-row").addEventListener("click", skipRow);
document.getElementById("open-in-browser").addEventListener("click", () => {
    
    let confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    if(!(
        document.getElementById("maximo-desc").reportValidity() &&
        document.getElementById("uom-field").reportValidity() &&
        document.getElementById("com-group").reportValidity() &&
        document.getElementById("gl-class").reportValidity()
    )){
        return;
    }

    confirmModal.toggle();
    getNextNumThenUpdate(document.getElementById("num-type").value);
});
document.getElementById("continueAuto").addEventListener("click", continueAuto);
document.getElementById("confirm-btn").addEventListener("click", () => {uploadItem();});
document.getElementById("upload-btn").addEventListener("click",() => {
    
    let confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    if(!(
        document.getElementById("maximo-desc").reportValidity() &&
        document.getElementById("uom-field").reportValidity() &&
        document.getElementById("com-group").reportValidity() &&
        document.getElementById("gl-class").reportValidity()
    )){
        return;
    }

    confirmModal.toggle();
    getNextNumThenUpdate(document.getElementById("num-type").value);
});

//batch upload:
document.getElementById("openBatchFile").addEventListener("click", () => {openFile("worksheet-path")});

document.getElementById("clear-batch-items-btn").addEventListener("click", () => {
    document.getElementById("batch-items-table").innerHTML = ``;
    document.getElementById("batch-upload-status-text").innerHTML='Waiting for paste...';
})
document.getElementById("batch-items-textinput").addEventListener("paste", (e) => {
    setTimeout(() => {
        let paste = e.target.value;
        let table = document.getElementById("batch-items-table-div");
        table.innerHTML = convertToTable(paste,"batch-items-table");
        document.getElementById("batch-upload-status-text").innerHTML='Paste detected! Edit table if needed and click upload.';
        e.target.value = "";
    },0)
})
document.getElementById("batch-upload-btn").addEventListener("click", () => {
    try{
        itemsToUpload = getItemsFromTable("batch-items-table")
    } catch (error){
        itemsToUpload = [];
        document.getElementById("batch-upload-status-text").innerHTML=error;
        return;
    }

    if(itemsToUpload.length > 0){
        itemsToUpload.forEach((value,idx)=>{
            if(value){
                updateItemStatus('loading',idx+1);
            }
        })
        batchUploadItems(itemsToUpload);
        return;
    } else {
        document.getElementById("batch-upload-status-text").innerHTML='No valid items to upload!';
    }
    
    return;
})
document.getElementById("batch-paste-btn").addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    const pasteEvent = new Event("paste", {"bubbles":true, "cancelable":false});
    let textinput = document.getElementById("batch-items-textinput");

    textinput.value = text;
    textinput.dispatchEvent(pasteEvent);
})
document.getElementById("batch-copy-headers-btn").addEventListener("click", () => {
    let copyText = `Maximo\tDescription\tIssue Unit\tCommodity Group\tGL Class\n\t`;
    navigator.clipboard.writeText(copyText);
    new Toast('Table copied to clipboard!');
})
//dark theme toggle
document.getElementById("dark-mode-switch").addEventListener("click", toggleTheme);
//Infinite scroll

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

document.getElementById("interact-num").addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        loadItem();
    }
});

// listener for general click events on icons
document.getElementById("accordion-validDescription").addEventListener('shown.bs.collapse', (event) => {
    document.getElementById("validate-badge").innerHTML = "";
    auto_grow('valid-description');
    auto_grow('translation-description');
});

function pauseAuto() {
    document.getElementById("modeSelect").checked = true;
}

function loadItem() {
    var itemnum = document.getElementById("interact-num").value.trim();
    new Toast(`Loading Item: ${itemnum}`);
    const worker = new WorkerHandler();
    worker.work(['loadItem', itemnum], showItem);
}

function auto_grow(elementID) {
    const element = document.getElementById(elementID);
    element.style.height = "5px";
    element.style.height = (element.scrollHeight)+"px";
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
        // input parameters
        wsName: document.getElementById("ws-name").value || "Sheet2", // name of ws
        inDesc: (document.getElementById("input-col").value || "F").toUpperCase().split(','), // description columns for input
        startRow: document.getElementById("start-row").value || "2",  // starting row of ws
        // output parameters
        outItemNum: document.getElementById("output-col").value.toUpperCase() || "E",
        outItemDesc: (document.getElementById("output-col-desc").value || "F,G,H").toUpperCase().split(','),
        outComm: document.getElementById("interact-num").value.toUpperCase() || "I", // commodity group out
        outGL: document.getElementById("interact-num").value.toUpperCase() || "J", // gl class out
        outUOM: document.getElementById("interact-num").value.toUpperCase() || "K", // uom out
        outQuestion: document.getElementById("interact-num").value.toUpperCase() || "L", // questions out
        outTranslate: document.getElementById("output-col-translation").value.toUpperCase() || "L",
        outMissing: document.getElementById("output-col-missing").value.toUpperCase() || "K",
        // output data
        itemNum: document.getElementById("interact-num").value || '999TEST',
        itemDesc: document.getElementById("maximo-desc").value || "TEST,ITEM,DESCRIPTION",
        commGroup: document.getElementById("com-group").value || "401", // commodity group in
        glClass: document.getElementById("gl-class").value || "6200000000000", //gl class in
        uom: document.getElementById("uom-field").value || "EA", // uom in
    };
    if (path) {
        params.filePath = path;
    } else {
        params.filePath = document.getElementById("worksheet-path").value;
    }
    return params;
}

function writeItemNum() {
    let num = document.getElementById("interact-num").value;
    if (num.length > 0) {
        let bar = new ProgressBar();
        bar.update(0, 'Writing item number to file');
        let path = document.getElementById("worksheet-path").value;
        let wsName = document.getElementById("ws-name").value;
        let rowNum = document.getElementById("current-row").innerHTML;
        let cols = document.getElementById("output-col").value;
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
    interactiveGoNext(Number(rowNum) + 1);
}

function openFile(pathElement) {
    const validFile = document.getElementById(pathElement);
    const filePath = validFile.value;
    if (filePath !== 'No file chosen') {
        new Toast('Opening File in Excel!');
        shell.openExternal(filePath);
    }
}

function openSettings() {
    ipcRenderer.send('openSettings');
    //sendsync blocks parent window...
    //https://github.com/electron/electron/issues/10426
}

function openExcel() {
    document.getElementById("input-col").value = document.getElementById("input-col").value.toUpperCase();
    document.getElementById("output-col").value = document.getElementById("output-col").value.toUpperCase();

    ipcRenderer.invoke('select-to-be-translated', 'finished').then((result) => {
        if (!result.canceled) {
            const worker = new WorkerHandler();
            const params = worksheetParams(result.filePaths[0]);
            worker.work(['interactive', params], finishLoadingBatch);
            document.getElementById("worksheet-path").value = result.filePaths[0];
        } else {
            new Toast('File Picker Cancelled');
        }
    });
}

//BATCH UPLOAD FUNCTIONS
/**
 * Reads a table and generates items from it
 *
 * @returns an array of items
 */
function getItemsFromTable(tableId) {
    colLoc = {
        description: -1,
        uom: -1,
        commGroup: -1,
        glClass: -1,
        maximo: -1,
    }

    let table=document.getElementById(`${tableId}`);
    //find Description, UOM, Commodity Group, and GL Class
    let rows = parseInt(table.getAttribute("data-rows"));
    let cols = parseInt(table.getAttribute("data-cols"));
    //iniitalize items array
    let items = [];
    //go through first row to find headings.
    let validParams = 0;
    for(let i = 1; i<=cols; i++){
        //get a cell in the table by its id
        let cell = document.getElementById("1-"+i);

        //see if cell value matches any of the required parameters to create an item object
        if(cell.innerHTML.toUpperCase()==='DESCRIPTION'){
            colLoc.description=i;
            validParams++;
        } else if(cell.innerHTML.toUpperCase()==='UOM'||cell.innerHTML.toUpperCase()==='ISSUE UNIT'){
            colLoc.uom=i;
            validParams++;
        } else if(cell.innerHTML.toUpperCase()==='COMMODITY GROUP' || cell.innerHTML.toUpperCase()==='COMM GROUP'){
            colLoc.commGroup=i;
            validParams++;
        } else if(cell.innerHTML.toUpperCase()==='GL CLASS'){
            colLoc.glClass=i;
            validParams++;
        } else if(cell.innerHTML.toUpperCase()==='MAXIMO' || cell.innerHTML.toUpperCase()==='ITEM NUMBER'){
            colLoc.maximo=i;
            validParams++;
        }
        //console.log(validParams)
    }

    if(validParams<5){
        let missingCols = "";
        let missingColArr = [];

        for(const property in colLoc){
            if(colLoc[property] == -1){
                console.log(property);

                missingColArr.push(property.toLowerCase());
            }
        }
        missingCols = missingColArr.join(', ');
        document.getElementById("batch-upload-status-text").innerHTML=`Table is missing ${5-validParams} column(s): (${missingCols}). Table will not be uploaded!`;
        return;
    }

    //console.log(colLoc);
    //loop thru all rows
    let invalidItems=0;
    for(let i=2; i<=rows; i++){
        let desc = sanitizeString(document.getElementById(i + "-"+colLoc.description).innerHTML);
        let uom = sanitizeString(document.getElementById(i+"-"+colLoc.uom).innerHTML);
        let commGroup = sanitizeString(document.getElementById(i+"-"+colLoc.commGroup).innerHTML);
        let glclass = sanitizeString(document.getElementById(i+"-"+colLoc.glClass).innerHTML);
        let maximo = sanitizeString(document.getElementById(i+"-"+colLoc.maximo).innerHTML);

        //if all required parameters are not available, don't create the item and move to next row
        if(desc==''||uom==''||commGroup==''||glclass==''){
            updateItemStatus('error',(i-1));
            items.push('');
            invalidItems++;
            continue;
        }

        let item = new Item(undefined,desc,uom,commGroup,glclass);
        if(colLoc.maximo!=-1 && maximo!=0 && maximo.toString().length === 7){
            item.itemnumber = maximo;
        } else if(desc.toUpperCase().includes("DWG")){
            item.series = 98;
        } else if(commGroup == "490" && glclass == "PLS"){
            //Change when when item num reachs 9920000
            item.series = 991;
        }
        //console.log(item);
        //add the item to the array
        items.push(item);
    }
    if(invalidItems>0){
        document.getElementById("batch-upload-status-text").innerHTML=`Warning! ${invalidItems} invalid items will not be uploaded`;
    }
    //console.log(invalidItems)
    //console.log(items);
    //return the item array
    return items;
}
/**
 * Uploads an item from item information accordion dropdown
 *
 */
async function uploadItem(){
    document.getElementById("confirm-btn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span> Uploading...</span>';
    document.getElementById("confirm-btn").disabled = true;
    const worker = new WorkerHandler();
    let item = new Item(
        sanitizeString(document.getElementById("interact-num").value),
        sanitizeString(document.getElementById("maximo-desc").value),
        sanitizeString(document.getElementById("uom-field").value),
        sanitizeString(document.getElementById("com-group").value),
        sanitizeString(document.getElementById("gl-class").value)
    );
    
    if(document.getElementById("long-desc").value.length > 0){
        item.longdescription = document.getElementById("long-desc").value;
    }

    worker.work(['uploadItems',[item]], (e) => {
        document.getElementById("error").innerHTML = "Upload Success"
        document.getElementById("confirm-btn").innerHTML = "Upload Item";
        document.getElementById("confirm-btn").disabled = false;
        let itemUrl = `https://prod.manage.prod.iko.max-it-eam.com/maximo/oslc/graphite/manage-shell/index.html?event=loadapp&value=item&additionalevent=useqbe&additionaleventvalue=itemnum=${item.itemnumber}`;
        document.getElementById("error").innerHTML = `Item Upload Successful! <a id="item-link" href = "${itemUrl}"> (Click to view item) </a>`;
        document.getElementById("item-link").addEventListener('click', function (e) {
            e.preventDefault();
            shell.openExternal(itemUrl);
        });
    });
}
/**
 * Uploads an array of items
 *
 */
async function batchUploadItems(items){
    const worker = new WorkerHandler();
    let btn = document.getElementById("batch-upload-btn");
    let clearBtn = document.getElementById("clear-batch-items-btn");
    clearBtn.disabled = true;
    btn.disabled = true;
    worker.work(['uploadItems',items,true],(e)=>{
        let finishText=`Upload Finished! ${e[2]} items uploaded. `;
        clearBtn.disabled = false;
        btn.disabled = false;
        updateItemNums(e[0]);
        let rows = parseInt(document.getElementById("batch-items-table").getAttribute("data-rows")) - 1;
        let nums="";
        for(let i = 2; i<=rows+1; i++){
            nums += document.getElementById(`${i}-${colLoc.maximo}`).innerHTML ? (document.getElementById(`${i}-${colLoc.maximo}`).innerHTML + ",") : "";
        }
        if(e[2]>0){
            let itemUrl = `https://prod.manage.prod.iko.max-it-eam.com/maximo?event=loadapp&value=item&additionalevent=useqbe&additionaleventvalue=itemnum=${nums}`;
            finishText += `<a id="batch-link" href="${itemUrl}">Click to view:</a>`
            document.getElementById("batch-upload-status-text").innerHTML = finishText;
            document.getElementById("batch-link").addEventListener('click', function (e) {
                e.preventDefault();
                shell.openExternal(itemUrl);
            });
        } else {
            document.getElementById("batch-upload-status-text").innerHTML = finishText;
        }   
        console.log("upload finished");
    });
}
/**
 * Gets a list of newly generated item nums and updates the table with them
 *
 */
function updateItemNums(arr){
    console.log(arr)
    for(const pair of arr){
        let num = pair[0];
        let itemindex = pair[1];
        let cell = document.getElementById(`${itemindex+1}-${colLoc.maximo}`);
        cell.innerHTML = num;
        cell.classList.add("table-alert");
    }
}
////////////////////////

function skipRow() {
    let row = document.getElementById("current-row").innerHTML;
    interactiveGoNext(Number(row) + 1);
}

function finishLoadingBatch(params) {
    let bar = new ProgressBar();
    // this has a special work thread since initializing a worker thread takes ~700 ms which is too long
    document.getElementById("valid-row").innerHTML = params[1];
    document.getElementById("total-row").innerHTML = params[2];
    const worker = new Worker('./worker.js');
    const db = new Database();
    let description = db.getDescription(params[0]);
    if (description === undefined) {
        bar.update(100, 'Done!');
        worker.terminate();
        new Toast('Finished Batch Processing');
        return false;
    }
    bar.update(0, 'Processing Descriptions');
    processBatch(worker, params[0], description);
    worker.onmessage = (msg) => {
        if (msg.data[0] === 'nextrow') {
            description = db.getDescription(msg.data[1]);
            if (description === undefined) {
                params = worksheetParams(document.getElementById("worksheet-path").value);
                worker.postMessage([
                    'saveProcessed',
                    [params, msg.data[1]]
                ]);
                new Toast('Finished Batch Processing');
                new Toast('Please wait for file to finish saving...');
                return false;
            }
            document.getElementById("current-row").innerHTML = description.row;
            bar.update(msg.data[1] / params[2] * 100, `Processing Description. Row: ${msg.data[1]} of ${params[2]}`);
            processBatch(worker, msg.data[1], description);
        } else if (msg.data[0] === 'saveComplete') {
            interactiveGoNext(msg.data[1]);
            new Toast('File Saved');
            worker.terminate();
        } else {
            console.log(`IDK: ${msg.data}`);
        }
    };
}

function processBatch(worker, row, description) {
    const interactive = document.getElementById("modeSelect").checked;
    const related = document.getElementById("relatedSelect").checked;
    const translate = document.getElementById("translateSelect").checked;
    const params = worksheetParams(document.getElementById("worksheet-path").value);
    if (interactive) {
        new Toast('Pausing / Switching to Interactive Mode');
        worker.postMessage([
            'saveProcessed',
            [params, row]
        ]);
    } else {
        worker.postMessage([
            'nonInteractive',
            [
                related,
                translate,
                description.description,
                document.getElementById('selected-language').value,
                params,
                row
            ]
        ]);
    }

}

function continueAuto() {
    document.getElementById("modeSelect").checked = false;
    finishLoadingBatch([
        Number(document.getElementById("current-row").innerHTML),
        document.getElementById("valid-row").innerHTML,
        document.getElementById("total-row").innerHTML,
    ]);
}

function interactiveGoNext(row) {
    let bar = new ProgressBar();
    const db = new Database();
    let description = db.getDescription(row);
    if (description === undefined) {
        bar.update(100, 'Done!');
        new Toast('End of File Reached');
        return false;
    }
    document.getElementById("current-row").innerHTML = description.row;
    if (description) {
        const worker = new WorkerHandler();
        document.getElementById("maximo-desc").value = description.description;
        worker.work(['validSingle', description.description], showResult);
    } else {
        let field = document.getElementById("maximo-desc");
        field.placeholder = "Row is blank, press skip row to go next";
        field.value = "";
        let bar = new ProgressBar();
        bar.update(100, 'Done');
    }
}

function validSingle(isExtended = false) {
    let bar = new ProgressBar();
    bar.update(0, 'Starting Item Description Validation');
    let raw_desc = document.getElementById("maximo-desc").value;
    const worker = new WorkerHandler();
    worker.work(['validSingle', raw_desc], (result) => {
        showResult(result, isExtended)
    });
}

function showResult(result, isExtended=false) {
    let triDesc = document.getElementById('result-triple-main');
    triDesc.value = result[0][0];
    triDesc = document.getElementById('result-triple-ext1');
    triDesc.value = result[0][1];
    triDesc = document.getElementById('result-triple-ext2');
    triDesc.value = result[0][2];
    triDesc = document.getElementById('result-single');
    triDesc.value = result[0][3];
    // triDesc = new bootstrap.Collapse(document.getElementById('accordion-validDescription'), { toggle: false });
    // triDesc.show();
    // showing badge instead of auto opening
    const related = document.getElementById("relatedSelect").checked;
    const translate = document.getElementById("translateSelect").checked;
    calcConfidence(result[0][3]);
    document.getElementById("validate-badge").innerHTML = "New";
    if (translate) {
        translationDescription(result[0][3]);
    }
    if (related) {
        findRelated(result[0],isExtended);
    }

}

function findRelated(result, isExtended=false) {
    const worker = new WorkerHandler();
    worker.work(['findRelated', result[3], isExtended], (result) => {showRelated(result, isExtended)});
}

function translationDescription(description) {
    // for now do not translate if english is selected
    if (document.getElementById("selected-language").value != 'en') {
        const worker = new WorkerHandler();
        if (document.getElementById('result-triple-ext1').value) {
            description = `${document.getElementById('result-triple-main').value},${document.getElementById('result-triple-ext1').value}`;
        } else {
            description = document.getElementById('result-triple-main').value;
        }
    
        worker.work([
            'translateItem',
            description,
            document.getElementById('selected-language').value,
            'post'
        ], displayTranslation);
    } else {
        new Toast('Currently translation into English is not supported');
    }

}

function displayTranslation(data) {
    document.getElementById('trans-desc').value = data[0];
    document.getElementById('translation-description').value = `The following words do not have a translation:\n${data[1]}\nPlease check logs at bottom of page for details`;
    auto_grow('translation-description');
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
        document.getElementById('valid-description').value = result.trim();
        auto_grow('valid-description');
    } else {
        new Toast('Blank Description');
    }
}

async function showRelated(result, isExtended = false) {
    let bar = new ProgressBar();
    if (!result[0]) {
        bar.update(100, 'Done!');
        return false;
    }
    relatedResults = {
        idx: 0,
        curKey: 0,
        results: result,
    }
    
    //reset table after called
    const relatedTable = document.getElementById('related-table');

    if(isExtended){
        relatedTable.classList.add(`isExt`);
    } else {
        if(relatedTable.classList.contains(`isExt`)){
            relatedTable.classList.remove(`isExt`);
        }
    }

    relatedTable.innerHTML = `
<table class="table table-bordered">
    <thead>
        <tr class="table-info" id="rel-items-heading">
        <th>Percent Match</th>
        <th>Item Number</th>
        <th>Item Description</th>
        ${(isExtended ? '<th>More Info</th>' : '')}
        <th>UOM</th>
        <th>C_Group</th>
        <th>GL_Class</th>
        <th></th>
        </tr>
    </thead>
    <tbody id="related-items"></tbody>
</table>
    `;
    //load a couple of items and ensure at least 2 items load
    document.getElementById('related-items-accordion-btn').classList.remove('collapsed');
    loadRelated();
    html = new bootstrap.Collapse(document.getElementById('accordion-relatedItem'), { toggle: false });
    html.show();
    bar.update(100, 'Done!');


}

function loadRelated(){
    const isExtended = document.getElementById('related-table').classList.contains('isExt');
    //console.log(relatedResults);
    const scores = relatedResults.results[0];
    //kill function if end of results has been reached
    if(relatedResults.curKey >= Object.entries(scores).length){
        return;
    } else if(Object.entries(scores)[relatedResults.curKey][1].length == 0) {
        //if no results for current key, move to next key and call function again
        relatedResults.curKey++;
        relatedResults.idx = 0;
        loadRelated();
        return;
    }

    let step = 20; //number of items to load at once
    //get arrs from results obj
    const itemNames = relatedResults.results[1];
    const searchWords = relatedResults.results[2].split(',');
    let html = '', color='';
    let itemName;
    const option = {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    };
    const formatter = new Intl.NumberFormat("en-US", option);
    // technically this is bad practise since object order might not be guarenteed 
    // https://stackoverflow.com/questions/983267/how-to-access-the-first-property-of-a-javascript-object

    let key = Object.entries(scores)[relatedResults.curKey][0]; //get the current key
    let value = Object.entries(scores)[relatedResults.curKey][1]; //get the array of items associated with key
    let sliced;

    if(relatedResults.idx+step >= value.length) {
        sliced = value.slice(relatedResults.idx,undefined);
        relatedResults.curKey++;
        relatedResults.idx = 0;
    } else {
        sliced = value.slice(relatedResults.idx,relatedResults.idx+step);
        relatedResults.idx += step;
    }

    // iterate thru each item in value array
    for (let item of sliced) {
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

            } /// data-theme="${document.documentElement.getAttribute("data-bs-theme")}" 
            if (key > 0.7) {
                color = 'table-success';
            } else if (key > 0.4) {
                color = 'table-warning';
            } else {
                color = 'table-danger';
            }

            html = `${html}\n<tr class="${color}">
            <td>${formatter.format(key)}</td>
            <td>${item}</td>
            ${(isExtended ? `<td>${itemName.substring(0,itemName.indexOf("|"))}</td>` : `<td>${itemName}</td>`)}
            ${(isExtended ? `<td>${itemName.slice(itemName.indexOf("|")+1)}</td>` : '')}
            <td>${itemNames[item][2]}</td>
            <td>${itemNames[item][3]}</td>
            <td>${itemNames[item][1]}</td>
            <td><i class="material-icons pointer sm-size"> add_task</i></td></tr>`;
        } else {
            html = `<tr class="table-danger"><td>0</td>\n<td>xxxxxxx</td>\n<td>No Related Items Found</td></tr>`;
        }
    }

    //add html to table
    const relatedTable = document.getElementById('related-items');
    relatedTable.innerHTML += html;

    //if less than 5 items loaded, load more
    if(sliced.length < 5){
        document.getElementById("everything").dispatchEvent(new Event('scroll'));
    }
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

