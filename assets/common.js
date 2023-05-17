//runs automagically

(function() {
    if(!(localStorage.getItem('theme'))){
        localStorage.setItem('theme','dark');
    }

    document.documentElement.setAttribute('data-bs-theme',localStorage.getItem('theme'));
})();

//classes



class WorkerHandler {
    async work(params, callback) {
        const worker = new Worker('./worker.js');
        worker.postMessage(params);
        worker.onmessage = (e) => {
            let log = new Logging();
            if (e.data[0] === 'result') {
                worker.terminate();
                callback(e.data.slice(1,));
            } else if (e.data[0] === 'error') {
                new Toast(e.data[1], 'bg-danger');
                let bar = new ProgressBar();
                bar.update(100, e.data[1]);
                log.error(e.data[1]);
                worker.terminate();
            } else if (e.data[0] === 'progress') {
                let bar = new ProgressBar();
                log.info(e.data[2]);
                bar.update(e.data[1], e.data[2]);
            } else if (e.data[0] === 'warning') {
                new Toast(e.data[1], 'bg-warning');
                log.warning(e.data[1]);
            } else if (e.data[0] === 'info') {
                new Toast(e.data[1], 'bg-info');
                log.info(e.data[1]);
            } else if (e.data[0] === 'debug') {
                log.info(e.data[1]);
            } else {
                console.log(`Unimplemented worker message ${e.data}`);
            }
        };
    }
}

class Logging {
    constructor() {
        this.logTable = document.getElementById("logs-table");
    }

    warning(msg) {
        let row = this.logTable.insertRow();
        row.innerHTML = `<td>WARNING</td><td>${msg}</td>`;
        row.classList.add("table-warning");
    }

    error(msg) {
        let row = this.logTable.insertRow();
        row.innerHTML = `<td>ERROR</td><td>${msg}</td>`;
        row.classList.add("table-danger");
    }

    info(msg) {
        let row = this.logTable.insertRow();
        row.innerHTML = `<td>INFO</td><td>${msg}</td>`;
        row.classList.add("table-primary");
    }
}

class ProgressBar {
    constructor() {
        this.progressBar = document.getElementById("progress-bar");
        this.progressText = document.getElementById("progress-text");
        this.currentProgress = this.progressBar.getAttribute('style');
        this.currentProgress = this.currentProgress.slice(7, this.currentProgress.length - 2);
    }

    updateProgressBar(percent) {
        this.progressBar.setAttribute('style', `width: ${percent}%;`);
    }

    update(percent, message, color = '') {
        this.updateProgressBar(percent);
        if (message) {
            this.progressText.innerText = message;
        }
        if (!color && percent == 0) {
            this.updateColor('bg-success');
        } else if (color) {
            this.updateColor(color);
        }

    }

    updateColor(color) {
        color = color + ' ';
        let regx = new RegExp('\\b' + 'bg-' + '[^ ]*[ ]?\\b', 'g');
        this.progressBar.className = this.progressBar.className.replace(regx, color);
    }

    addProgressBar(percent, message = null) {
        this.update(percent + this.currentProgress, message);
    }

    getProgress() {
        return {
            'percent': this.currentProgress,
            'message': this.progressText.innerText
        };
    }
}

class Toast {
    constructor(newMessage, color = 'bg-primary') {
        this.toastContainer = document.getElementById('toastPlacement');
        this.newToast(newMessage, color);
    }

    newToast(message, color) {
        let toast = document.createElement('div');
        toast.setAttribute('class', `toast d-flex align-items-center border-0 text-white ${color}`);
        toast.innerHTML = `<div class="toast-body">${message}</div><button type="button" class="btn-close ms-auto me-2" data-bs-dismiss="toast"></button>`;
        let bsToast = new bootstrap.Toast(toast);
        this.toastContainer.appendChild(toast);
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', (e) => {
            e.target.remove();
        });
    }
}

//functions
    //general
function fixSwitch(){
    document.getElementById('dark-mode-switch').checked = (localStorage.getItem('theme') === 'dark' ? true : false);
}

function toTop() {
    let element = document.getElementsByTagName("main");
    element[0].scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function toEnd() {
    let element = document.getElementsByTagName("main");
    element[0].scrollTop = element[0].scrollHeight; // For Chrome, Firefox, IE and Opera
}
    //theme related
function toggleTheme(){
    setTheme(localStorage.getItem('theme') === 'dark' ? 'light' : 'dark');
}

function setTheme(newTheme){
    //safety
    if(localStorage.getItem('theme')===newTheme){
        return;
    }

    localStorage.setItem('theme', `${newTheme}`);
    document.documentElement.setAttribute("data-bs-theme",newTheme);
}

function loadTheme(){
    if(!(localStorage.getItem('theme'))){
        localStorage.setItem('theme','dark');
    }

    document.documentElement.setAttribute('data-bs-theme',localStorage.getItem('theme'));
    console.log('i have run');
}
/*

<span class="spinner-border spinner-border-sm" role="status"></span>
<span class="sr-only">Loading...</span>

*/
    //upload item related
function getNextNumThenUpdate(){
        document.getElementById("error").innerHTML = "Waiting for confirm...";
        const worker = new WorkerHandler();
        document.getElementById("confirm-btn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span class="sr-only"> Loading...</span>';
        document.getElementById("confirm-btn").disabled = true;
        document.getElementById("item-itemnum").innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span class="sr-only"> Retreiving the latest item number...</span>';
        worker.work(['getNextItemNumber'], updateItemInfo);
        console.log("Getting new number from server")
}

function updateItemInfo(newItemNum){
    let itemnum = document.getElementById("interact-num");
        itemnum.value = newItemNum[1] + 1;
    let desc = document.getElementById("maximo-desc");
    let uom = document.getElementById("uom-field");
    let commGroup = document.getElementById("com-group");
    let glclass = document.getElementById("gl-class");

    document.getElementById("item-itemnum").innerHTML=itemnum.value;
    document.getElementById("item-desc").innerHTML=desc.value;
    document.getElementById("item-uom").innerHTML=uom.value;
    document.getElementById("item-commgroup").innerHTML=commGroup.value;
    document.getElementById("item-glclass").innerHTML=glclass.value;

    document.getElementById("confirm-btn").innerHTML = "Upload Item";
    document.getElementById("confirm-btn").disabled = false;
}

async function uploadItem(){
    let item;
    let itemnum = document.getElementById("interact-num");
    let desc = document.getElementById("maximo-desc");
    let uom = document.getElementById("uom-field");
    let commGroup = document.getElementById("com-group");
    let glclass = document.getElementById("gl-class");
    let longdesc = document.getElementById("long-desc");
    let url = "https://test.manage.test.iko.max-it-eam.com/maximo/api/os/IKO_ITEMMASTER?action=importfile";
    let apiKey = "rho0tolsq1m2vbgkp22aipg48pe326prai0dicl4";

    try{
        item = {
            //initalize properties
            //crucial properties
            itemnumber: itemnum.value,
            description: desc.value,
            issueunit: uom.value,
            commoditygroup: commGroup.value,
            glclass: glclass.value,
    
            //optional properties
            longdescription: "",
            assetprefix: "",
            assetseed: "",
            jpnum: "",
            inspectionrequired: 0,
            isimport: 0,
            rotating: 0,
        }
    
        if(longdesc.value.length>0){
            item.longdescription = longdesc.value;
        }
    
        console.log(item.itemnumber);
    } catch (err){
        document.getElementById("error").innerHTML = err;
        console.log(err)
        return;
    }
    document.getElementById("error").innerHTML = "Waiting for confirm...";

    let xmldoc =     
`<?xml version="1.0" encoding="UTF-8"?>
<SyncIKO_ITEMMASTER xmlns="http://www.ibm.com/maximo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<IKO_ITEMMASTERSet>
    <ITEM>
        <COMMODITYGROUP>${item.commoditygroup}</COMMODITYGROUP>
        <DESCRIPTION>${item.description}</DESCRIPTION>
        <DESCRIPTION_LONGDESCRIPTION>${item.longdescription}</DESCRIPTION_LONGDESCRIPTION>
        <EXTERNALREFID>${item.glclass}</EXTERNALREFID>
        <IKO_ASSETPREFIX>${item.assetprefix}</IKO_ASSETPREFIX>
        <IKO_ASSETSEED>${item.assetseed}</IKO_ASSETSEED>
        <IKO_JPNUM>${item.jpnum}</IKO_JPNUM>
        <INSPECTIONREQUIRED>${item.inspectionrequired}</INSPECTIONREQUIRED>
        <ISIMPORT>${item.isimport}</ISIMPORT>
        <ISSUEUNIT>${item.issueunit}</ISSUEUNIT>
        <ITEMNUM>${item.itemnumber}</ITEMNUM>
        <ITEMSETID>ITEMSET1</ITEMSETID>
        <ROTATING>${item.rotating}</ROTATING>
        <STATUS>ACTIVE</STATUS>
    </ITEM>
</IKO_ITEMMASTERSet>
</SyncIKO_ITEMMASTER>`;

    console.log(xmldoc);
    document.getElementById("error").innerHTML = "Trying Upload..."
    document.getElementById("confirm-btn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span class="sr-only"> Uploading...</span>';
    document.getElementById("confirm-btn").disabled = true;
    try{
        let response = await fetch(url, {
            method: "POST",
            headers: {
                "apiKey":apiKey,
                "filetype":"XML",
                "preview":1,
            },
            body: xmldoc,
        });
        let result = await response.json();
        console.log(result);
        if(result.validdoc!=1){
            throw new Error("Invalid input parameters");
        }
    } catch (err) {
        document.getElementById("error").innerHTML = err;
        console.log(err);
        console.log("Item upload failed!");
    }    

    let response = await fetch(url, {
        method: "POST",
        headers: {
            "apiKey":apiKey,
            "filetype":"XML",
        },
        body: xmldoc,
    });
    console.log(await response.json());
    console.log("Success");

    document.getElementById("confirm-btn").innerHTML = 'Upload Item';
    document.getElementById("confirm-btn").disabled = false;
    document.getElementById("error").innerHTML = 
    `Item Upload Successful! Click link to view item: <a id="item-link" href = "https://test.manage.test.iko.max-it-eam.com/maximo/ui/login?event=loadapp&value=item&additionalevent=useqbe&additionaleventvalue=itemnum=${item.itemnumber}"> link <a>`;
    document.getElementById("item-link").addEventListener('click', function (e) {
        e.preventDefault();
        shell.openExternal(`https://test.manage.test.iko.max-it-eam.com/maximo/ui/login?event=loadapp&value=item&additionalevent=useqbe&additionaleventvalue=itemnum=${item.itemnumber}`);
    });
}

