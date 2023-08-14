const { clipboard, ipcRenderer, shell } = require('electron');
const fs = require('fs');
const path = require('path');
// const { dialog } = require('electron').remote;
const Database = require('../assets/indexDB');
const SharedDatabase = require('../assets/sharedDB');
const Validate = require('../assets/validators');
const Maximo = require('../assets/maximo');
let itemsToUpload = [];
let imgsToUpload = [];
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

window.onload = function () {
    document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
    if (localStorage.getItem('powerUser') === 'true') {
        document.getElementById("upload-btn").style.display = "block";
        document.getElementById("request-btn").style.display = "none";
        document.getElementById("batch-upld-btn").style.display = "block";
        document.getElementById("img-upld-toggle").style.display = "block";
        document.getElementById("batch-mode-toggle").style.display = "block";
        return;
    }
}
//power user toggle
document.getElementById("secret-button").addEventListener('click', (e) => {
    let isPowerUser = false;
    let numClicks = parseInt(e.target.getAttribute('data-clicks'));

    numClicks++;
    //console.log(numClicks);

    if (numClicks === 5) {
        isPowerUser = true;
        localStorage.setItem('powerUser', 'true');
        e.target.setAttribute('data-clicks', '0');
    }
    else {
        localStorage.setItem('powerUser', 'false');
        e.target.setAttribute('data-clicks', `${numClicks}`);
        isPowerUser = false;
    }
    //toggle button display based off of power user status
    if (isPowerUser == true) {
        document.getElementById("upload-btn").style.display = "block";
        document.getElementById("request-btn").style.display = "none";
        document.getElementById("batch-upld-btn").style.display = "block";
        document.getElementById("img-upld-toggle").style.display = "block";
        document.getElementById("batch-mode-toggle").style.display = "block";
    }
    else {
        document.getElementById("upload-btn").style.display = "none";
        document.getElementById("request-btn").style.display = "block";
        document.getElementById("batch-upld-btn").style.display = "none";
        document.getElementById("img-upld-toggle").style.display = "none";
        document.getElementById("batch-mode-toggle").style.display = "none";
    }
});

//gets user site information
async function getSite(credentials = {}) {
    const maximo = new Maximo();
    const currInfo = await maximo.checkLogin(credentials?.userid, credentials?.password);
    return currInfo.siteID;
}

//Request item
document.getElementById("request-btn").addEventListener('click', () => {

    let requestModal = new bootstrap.Modal(document.getElementById("requestModal"));
    requestModal.toggle();

    let currPass = new SharedDatabase().getPassword(),
        userid = currPass.userid;
    let siteID;

    const sites = {
        'AA': ['AAG: Brampton B2 Storeroom', 'AAL: Brampton B2/B4 Maintenance Storeroom', 'AAO: Brampton B4 Oxidizer Storeroom'],
        'ANT': ['AN1: Antwerp Mod Line Storeroom', 'AN2: Antwerp Coating Line Storeroom'],
        'BA': ['BAL: IKO Calgary Maintenance Storeroom'],
        'BL': ['BLC: Hagerstown TPO Storeroom', 'BLD: Hagerstown ISO Storeroom', 'BLL: Hagerstown Maintenance Storeroom(Shared)'],
        'CA': ['CAL">IKO Kankakee Maintenance Storeroom'],
        'CAM': ['C61">IKO Appley Bridge Maintenance Storeroom'],
        'COM': ['CB1">Combronde Maintenance Storeroom'],
        'GA': ['GAL: IKO Wilmington Maintenance Storeroom'],
        'GC': ['GCL: Sumas Maintenance Storeroom', 'GCA: Sumas Shipping Storeroom', 'GCD: Sumas Shingle Storeroom', 'GCG: Sumas Mod Line Storeroom', 'GCJ: Sumas Crusher Storeroom', 'GCK: Sumas Tank Farm Storeroom'],
        'GE': ['GEL: Ashcroft Maintenance Storeroom'],
        'GH': ['GHL: IKO Hawkesbury Maintenance Storeroom'],
        'GI': ['GIL: IKO Madoc Maintenance Storeroom'],
        'GJ': ['GJL: CRC Toronto Maintenance Storeroom'],
        'GK': ['GKA: IG Brampton B7 and B8 Storeroom', 'GKC: IG Brampton B6 and Laminator Storeroom', 'GKL: IG Brampton Maintenance Storeroom'],
        'GM': ['GML: IG High River Maintenance Storeroom'],
        'GP': ['GPL: CRC Brampton Maintenance Storeroom'],
        'GR': ['GRL: Bramcal Maintenance Storeroom'],
        'GS': ['GSL: Sylacauga Maintenance Storeroom'],
        'GV': ['GVL: IKO Hillsboro Maintenance Storeroom'],
        'GX': ['GXL: Maxi-Mix Maintenance Storeroom'],
        'KLU': ['KD1: IKO Klundert Maintenance Storeroom', 'KD2: IKO Klundert Lab Storeroom', 'KD3: IKO Klundert Logistics Storeroom'],
        'PBM': ['PB6: Slovakia Maintenance Storeroom'],
        'RAM': ['RA6: IKO Alconbury Maintenance Storeroom']
        // Add more sites and storerooms as needed...
    };

    const userSite = getSite({ userid: userid, password: currPass.password });
    userSite.then(response => {
        siteID = response;

        const storeroomSelect = document.getElementById('storeroom');
        //poppulate correct user storerooms in modal
        function updateStoreroomOptions() {

            storeroomSelect.options.length = 1;

            // Add new options
            const neededStorerooms = sites[siteID];
            for (const storeroom of neededStorerooms) {
                const option = document.createElement('option');
                option.value = storeroom;
                option.text = storeroom;
                storeroomSelect.add(option);
            }
        }
        updateStoreroomOptions();
    })
        .catch(error => console.error(`Error: ${error}`));

    poppulateModal();
});

//Allow input of manufacturer name & part number if "Other" is selected
document.getElementById("manu-name").addEventListener('click', (e) => {
    if (e.target.value == "Other") {
        document.getElementById("pref-manu").style.display = "block";
        document.getElementById("part-form").style.display = "block";
    }
    else {
        document.getElementById("pref-manu").style.display = "none";
        document.getElementById("part-form").style.display = "none";
    }
})

//download email file when submit button is pressed
document.getElementById("submit-btn").addEventListener('click', submitMail, false);

function submitMail() {

    //checking required fields are filled
    if (document.getElementById("manu-name").value == "Other") {

        if (!(document.getElementById("part-num").reportValidity() &&
            document.getElementById("storeroom").reportValidity() &&
            document.getElementById("item-descr").reportValidity())) {
            console.log("Required fields still empty");
            return;
        }
    }
    else {

        if (!(document.getElementById("storeroom").reportValidity() &&
            document.getElementById("item-descr").reportValidity())) {
            console.log("Required fields still empty");
            return;
        }
    }
    //storing current date and time for email subject
    let currentdate = new Date();
    var datetime = currentdate.getFullYear() + "/" + (currentdate.getMonth() + 1) + "/" + (currentdate.getDay() + 1)
        + " @ "
        + currentdate.getHours() + ":"
        + currentdate.getMinutes() + ":" + currentdate.getSeconds();
    let mailText =
        `<textarea id="textbox" cols="2" rows="13" style="display: none">
To: Maximo Item request <maximo.item@iko.com>
Subject: Item request ${datetime}
X-Unsent: 1
Content-Type: text/html; boundary=--boundary_text_string 

<html>
<h2>Item Request</h2> 
<table>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Item number type:</td>
  <td id="number-type2" style="border: 0.01cm solid black;">${document.getElementById("number-type").value}XXXXX</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Item description:</td>
  <td id="item-descr2" style="border: 0.01cm solid black;">${document.getElementById("maximo-desc").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Commodity group:</td>
  <td id="comm-grp2" style="border: 0.01cm solid black;">${document.getElementById("com-group").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Issue Unit:</td>
  <td id="issue-unit2" style="border: 0.01cm solid black;">${document.getElementById("uom-field").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">GL class:</td>
  <td id="gl-class2" style="border: 0.01cm solid black;">${document.getElementById("gl-class-new").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Storeroom:</td>
  <td id="storeroom2" style="border: 0.01cm solid black;">${document.getElementById("storeroom").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Vendor number:</td>
  <td id="ven-num2" style="border: 0.01cm solid black;">${document.getElementById("ven-num").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Catalog number:</td>
  <td id="cat-num2" style="border: 0.01cm solid black;">${document.getElementById("cat-num").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Manufacturer type:</td>
  <td id="manu-type2" style="border: 0.01cm solid black;">${document.getElementById("manu-name").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Manufacturer name:</td>
  <td id="manu-name2" style="border: 0.01cm solid black;">${document.getElementById("pref-manu").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Part number:</td>
  <td id="part-num2" style="border: 0.01cm solid black;">${document.getElementById("part-num").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Spare parts asset number:</td>
  <td id="asset-num2" style="border: 0.01cm solid black;">${document.getElementById("asset-num").value}</td>
</tr>
<tr style="border: 0.01cm solid black;">
  <td style="border: 0.01cm solid black;">Website link:</td>
  <td id="web-link2" style="border: 0.01cm solid black;">${document.getElementById("web-link").value}</td>
</tr>
</table>
</html>
</textarea>`;

    //Send string to main process to write file
    ipcRenderer.send('write-file', mailText);
    //requestModal.toggle();
}

//Infinite scroll
document.getElementById("everything").addEventListener('scroll', () => {
    //dont add items to the list if the accordion is collapsed
    if (document.getElementById("related-items-accordion-btn").classList.contains("collapsed") || relatedResults.results.length == 0) {
        return;
    }

    let element = document.getElementById("related-items");

    let domRect = element.getBoundingClientRect();
    let spaceBelow = document.getElementById("everything").offsetHeight - domRect.bottom;
    //console.log(spaceBelow);
    if (spaceBelow > -100) {
        //load more items if the bottom of the table is less than 100px below the bottom of the viewport
        loadRelated();
    }
})
//Image upload
document.getElementById("imgInput").addEventListener("change", async (e) => {
    let progressBar = new ProgressBar();

    document.getElementById("imgList").innerHTML = ``;
    let files = document.getElementById("imgInput").files;
    imgsToUpload = files;
    let nums = '';

    if (files.length == 0 || !files) {
        return;
    }

    let imgList = document.getElementById("imgList");

    progressBar.update(0, 'Loading Images...');


    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let completion = (i + 1) / files.length * 100;

        nums += file.name.slice(0, 7) + ',';
        progressBar.updateProgressBar(completion);

        imgList.innerHTML += `
<li class="d-flex align-items-center justify-content-between list-group-item">
    <div class="d-flex align-items-center">
        <img src="${URL.createObjectURL(file)}" class="img-thumbnail me-2">
        <p class="mb-0"><strong>${file.name.slice(0, 7)}</strong></p>
    </div>
    <i id="img-${i}-status" class="material-icons">pending</i>
</li>`;
    }

    let url = `https://prod.manage.prod.iko.max-it-eam.com/maximo/oslc/graphite/manage-shell/index.html?event=loadapp&value=item&additionalevent=useqbe&additionaleventvalue=itemnum=${nums}`;
    document.getElementById("img-upload-status-text").innerHTML = `<a href=${url} id="imgs-link">Selected Items:</a>`;
    document.getElementById("imgs-link").addEventListener('click', function (e) {
        e.preventDefault();
        shell.openExternal(url);
        // TODO move this to main
    });

    progressBar.update(100, 'Ready to Upload!');
});

document.getElementById("imgInput").addEventListener("click", () => {
    document.getElementById("img-clear-btn").dispatchEvent(new Event('click'));
});
document.getElementById("img-clear-btn").addEventListener("click", () => {
    let progressBar = new ProgressBar();
    document.getElementById("imgList").innerHTML = ``;
    progressBar.update(100, 'Ready!');
    imgsToUpload = [];
    document.getElementById("imgInput").value = null;
    document.getElementById("img-upload-status-text").innerHTML = 'Select Images to Continue...';
    //
});
document.getElementById("img-upload-btn").addEventListener("click", () => {
    let progressBar = new ProgressBar();
    let clearBtn = document.getElementById('img-clear-btn');
    let uploadBtn = document.getElementById('img-upload-btn');

    if (imgsToUpload.length == 0) {
        new Toast('No Images Selected!');
        return;
    }

    let finishedItems = 0;

    clearBtn.disabled = true;
    uploadBtn.disabled = true;

    const worker = new WorkerHandler();

    progressBar.update(0, 'Uploading Images...');

    worker.work(['uploadImages', imgsToUpload], (result) => {
        if (result[0] == 'success') {
            document.getElementById(`img-${result[1]}-status`).innerHTML = `done`;
        } else if (result[0] == 'fail') {
            document.getElementById(`img-${result[1]}-status`).innerHTML = `close`;
        } else if (result[0] == 'done') {
            progressBar.update(100, 'Upload Complete!');
            clearBtn.disabled = false;
            uploadBtn.disabled = false;
        } else if (result[0] == 'warning') {
            document.getElementById(`img-${result[1]}-status`).innerHTML = `warning`;
        } else if (result[0] == 'total failure') {
            finishedItems = imgsToUpload.length;
            progressBar.update(100, 'Error occurred while attempting upload!');
            document.getElementById("img-upload-status-text").innerHTML = `Upload Failed: ${result[1]}}`;
            clearBtn.disabled = false;
            uploadBtn.disabled = false;
        }

        if (result != 'done') {
            finishedItems++;
        }

        progressBar.updateProgressBar(finishedItems * 100 / imgsToUpload.length);

        //console.log(result);
    });
});

//Other
document.getElementById("load-item").addEventListener("click", loadItem);
document.getElementById("valid-single").addEventListener("click", () => { validSingle() });
document.getElementById("valid-single-ext").addEventListener("click", () => { validSingle(true) });
document.getElementById("settings").addEventListener("click", openSettings);
document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);
document.getElementById("interactive").addEventListener("click", openExcel);
document.getElementById("worksheet-path").addEventListener("click", openExcel);
document.getElementById("pauseAuto").addEventListener("click", pauseAuto);

document.getElementById("save-desc").addEventListener("click", writeDescription);
document.getElementById("save-num").addEventListener("click", writeItemNum);
document.getElementById("skip-row").addEventListener("click", skipRow);
document.getElementById("continueAuto").addEventListener("click", continueAuto);
document.getElementById("confirm-btn").addEventListener("click", () => { uploadItem(); });
document.getElementById("upload-btn").addEventListener("click", () => {

    let confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
    if (!(
        document.getElementById("maximo-desc").reportValidity() &&
        document.getElementById("uom-field").reportValidity() &&
        document.getElementById("com-group").reportValidity() &&
        document.getElementById("gl-class").reportValidity()
    )) {
        return;
    }
    ItemAnalysis();
    confirmModal.toggle();
    getNextNumThenUpdate(document.getElementById("num-type").value);
});


//batch upload:
document.getElementById("openBatchFile").addEventListener("click", () => { openFile("worksheet-path") });

document.getElementById("clear-batch-items-btn").addEventListener("click", () => {
    document.getElementById("batch-items-table").innerHTML = ``;
    document.getElementById("batch-copy-nums").disabled = true;
    document.getElementById("batch-upload-status-text").innerHTML = 'Waiting for paste...';
})

document.getElementById("batch-copy-nums").addEventListener("click", () => {
    try {
        let result = getItemsFromTable("batch-items-table");
        if (result == undefined || result == null || result == 0) {
            throw ('Table missing columns');
        }
        let rows = parseInt(document.getElementById("batch-items-table").getAttribute("data-rows")) - 1;
        let nums = "";
        for (let i = 2; i <= rows + 1; i++) {
            nums += document.getElementById(`${i}-${colLoc.maximo}`).innerHTML ? (document.getElementById(`${i}-${colLoc.maximo}`).innerHTML + "\n") : "";
        }
        navigator.clipboard.writeText(nums);
        new Toast('Item Numbers Copied to Clipboard!');
    } catch (error) {
        //console.log(error);
        new Toast('Unable to copy numbers, please check table formatting!');
    }

});

document.getElementById("batch-items-textinput").addEventListener("paste", (e) => {
    setTimeout(() => {
        let paste = e.target.value;
        let table = document.getElementById("batch-items-table-div");
        table.innerHTML = convertToTable(paste, "batch-items-table");

        document.getElementById("batch-copy-nums").disabled = false;

        document.getElementById("batch-upload-status-text").innerHTML = 'Paste detected! Edit table if needed and click upload.';
        e.target.value = "";
    }, 0)
})
document.getElementById("batch-upload-btn").addEventListener("click", () => {
    try {
        itemsToUpload = getItemsFromTable("batch-items-table")
    } catch (error) {
        itemsToUpload = [];
        document.getElementById("batch-upload-status-text").innerHTML = `Error, check table format! (${error})`;
        return;
    }

    if (itemsToUpload.length > 0) {
        itemsToUpload.forEach((value, idx) => {
            if (value) {
                updateItemStatus('loading', idx + 1);
            }
        })
        batchUploadItems(itemsToUpload);
        return;
    } else {
        document.getElementById("batch-upload-status-text").innerHTML = 'No valid items to upload!';
    }

    return;
})
document.getElementById("batch-paste-btn").addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    const pasteEvent = new Event("paste", { "bubbles": true, "cancelable": false });
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
    debugger;
    const element = document.getElementById(elementID);
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
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

    let table = document.getElementById(`${tableId}`);
    //find Description, UOM, Commodity Group, and GL Class
    let rows = parseInt(table.getAttribute("data-rows"));
    let cols = parseInt(table.getAttribute("data-cols"));
    //iniitalize items array
    let items = [];
    //go through first row to find headings.
    let validParams = 0;
    for (let i = 1; i <= cols; i++) {
        //get a cell in the table by its id
        let cell = document.getElementById("1-" + i);

        //see if cell value matches any of the required parameters to create an item object
        if (cell.innerHTML.toUpperCase() === 'DESCRIPTION') {
            colLoc.description = i;
            validParams++;
        } else if (cell.innerHTML.toUpperCase() === 'UOM' || cell.innerHTML.toUpperCase() === 'ISSUE UNIT') {
            colLoc.uom = i;
            validParams++;
        } else if (cell.innerHTML.toUpperCase() === 'COMMODITY GROUP' || cell.innerHTML.toUpperCase() === 'COMM GROUP') {
            colLoc.commGroup = i;
            validParams++;
        } else if (cell.innerHTML.toUpperCase() === 'GL CLASS') {
            colLoc.glClass = i;
            validParams++;
        } else if (cell.innerHTML.toUpperCase() === 'MAXIMO' || cell.innerHTML.toUpperCase() === 'ITEM NUMBER') {
            colLoc.maximo = i;
            validParams++;
        }
        //console.log(validParams)
    }

    if (validParams < 5) {
        let missingCols = "";
        let missingColArr = [];

        for (const property in colLoc) {
            if (colLoc[property] == -1) {
                console.log(property);

                missingColArr.push(property.toLowerCase());
            }
        }
        missingCols = missingColArr.join(', ');
        document.getElementById("batch-upload-status-text").innerHTML = `Table is missing ${5 - validParams} column(s): (${missingCols}). Table will not be uploaded!`;
        return;
    }

    //console.log(colLoc);
    //loop thru all rows
    let invalidItems = 0;
    for (let i = 2; i <= rows; i++) {
        let desc = sanitizeString(document.getElementById(i + "-" + colLoc.description).innerHTML);
        let uom = sanitizeString(document.getElementById(i + "-" + colLoc.uom).innerHTML).toUpperCase();
        let commGroup = sanitizeString(document.getElementById(i + "-" + colLoc.commGroup).innerHTML);
        let glclass = sanitizeString(document.getElementById(i + "-" + colLoc.glClass).innerHTML).toUpperCase();
        let maximo = sanitizeString(document.getElementById(i + "-" + colLoc.maximo).innerHTML);

        //if all required parameters are not available, don't create the item and move to next row
        if (desc == '' || uom == '' || commGroup == '' || glclass == '' || desc == 0 || uom == 0 || commGroup == 0 || glclass == 0) {
            updateItemStatus('error', (i - 1));
            items.push('');
            invalidItems++;
            continue;
        }

        let item = new Item(undefined, desc, uom, commGroup, glclass);
        if (colLoc.maximo != -1 && maximo != 0 && maximo.toString().length === 7) {
            item.itemnumber = maximo;
        } else if (desc.toUpperCase().includes("DWG")) {
            item.series = 98;
        } else if (commGroup == "490" && glclass == "PLS") {
            //Change when when item num reachs 9920000
            item.series = 991;
        }
        //console.log(item);
        //add the item to the array
        items.push(item);
    }
    if (invalidItems > 0) {
        document.getElementById("batch-upload-status-text").innerHTML = `Warning! ${invalidItems} invalid items will not be uploaded`;
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
async function uploadItem() {
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

    if (document.getElementById("long-desc").value.length > 0) {
        item.longdescription = document.getElementById("long-desc").value;
    }



    worker.work(['uploadItems', [item]], (e) => {
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
async function batchUploadItems(items) {
    const worker = new WorkerHandler();
    let btn = document.getElementById("batch-upload-btn");
    let clearBtn = document.getElementById("clear-batch-items-btn");
    clearBtn.disabled = true;
    btn.disabled = true;
    worker.work(['uploadItems', items, true], (e) => {
        let finishText = `Upload Finished! ${e[2]} items uploaded. `;
        clearBtn.disabled = false;
        btn.disabled = false;
        updateItemNums(e[0]);
        let rows = parseInt(document.getElementById("batch-items-table").getAttribute("data-rows")) - 1;
        let nums = "";
        for (let i = 2; i <= rows + 1; i++) {
            nums += document.getElementById(`${i}-${colLoc.maximo}`).innerHTML ? (document.getElementById(`${i}-${colLoc.maximo}`).innerHTML + ",") : "";
        }
        if (e[2] > 0) {
            let itemUrl = `https://prod.manage.prod.iko.max-it-eam.com/maximo/oslc/graphite/manage-shell/index.html?event=loadapp&value=item&additionalevent=useqbe&additionaleventvalue=itemnum=${nums}`;
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
function updateItemNums(arr) {
    for (const pair of arr) {
        let num = pair[0];
        let itemindex = pair[1];
        let cell = document.getElementById(`${itemindex + 1}-${colLoc.maximo}`);
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

function showResult(result, isExtended = false) {
    let triDesc = document.getElementById('result-triple-main');
    triDesc.value = result[0][0];
    triDesc = document.getElementById('result-triple-ext1');
    triDesc.value = result[0][1];
    triDesc = document.getElementById('result-triple-ext2');
    triDesc.value = result[0][2];
    const related = document.getElementById("relatedSelect").checked;
    const translate = document.getElementById("translateSelect").checked;
    calcConfidence(result[0][3]);
    document.getElementById("validate-badge").innerHTML = "New";
    if (translate) {
        translationDescription(result[0][3]);
    }
    if (related) {
        findRelated(result[0], isExtended);
    }
}

async function ItemAnalysis() {
    const valid = new Validate();
    let raw_desc = document.getElementById("maximo-desc").value;
    let result = await valid.validateSingle(raw_desc);
    let triDesc = document.getElementById('result-triple-main');
    triDesc.value = result[0];
    triDesc = document.getElementById('result-triple-ext1');
    triDesc.value = result[1];
    triDesc = document.getElementById('result-triple-ext2');
    triDesc.value = result[2];
    calcConfidence(result[3]);
}

function findRelated(result, isExtended = false) {
    const worker = new WorkerHandler();
    worker.work(['findRelated', result[3], isExtended], (result) => { showRelated(result, isExtended) });
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

    //reverse results
    for (const [key, value] of Object.entries(result[0])) {
        result[0][key] = result[0][key].reverse();
    }

    relatedResults = {
        idx: 0,
        curKey: 0,
        results: result,
    }

    //reset table after called
    const relatedTable = document.getElementById('related-table');

    if (isExtended) {
        relatedTable.classList.add(`isExt`);
    } else {
        if (relatedTable.classList.contains(`isExt`)) {
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

function loadRelated() {
    const isExtended = document.getElementById('related-table').classList.contains('isExt');
    //console.log(relatedResults);
    const scores = relatedResults.results[0];
    //kill function if end of results has been reached
    if (relatedResults.curKey >= Object.entries(scores).length) {
        return;
    } else if (Object.entries(scores)[relatedResults.curKey][1].length == 0) {
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
    let html = '', color = '';
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

    if (relatedResults.idx + step >= value.length) {
        sliced = value.slice(relatedResults.idx, undefined);
        relatedResults.curKey++;
        relatedResults.idx = 0;
    } else {
        sliced = value.slice(relatedResults.idx, relatedResults.idx + step);
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
            ${(isExtended ? `<td>${itemName.substring(0, itemName.indexOf("|"))}</td>` : `<td>${itemName}</td>`)}
            ${(isExtended ? `<td>${itemName.slice(itemName.indexOf("|") + 1)}</td>` : '')}
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
    if (sliced.length < 5) {
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
