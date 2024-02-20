"use strict";
// Debug stuff
document.getElementById("selected_file").innerHTML = 'C:\\Users\\majona\\Documents\\GitHub\\iko_mro_items\\assets\\Translation_PM_JP_Asset.xlsx';
document.getElementById("selected_jobtasks").innerHTML = `C:\\Users\\majona\\Documents\\jp_pm_translation-test_ant.xlsx`;
const { ipcRenderer } = require('electron');
document.getElementById("topButton").addEventListener("click", toTop);
document.getElementById("endButton").addEventListener("click", toEnd);
document.getElementById("select_file").addEventListener("click", selectFile);
document.getElementById("select_jobtasks").addEventListener("click", selectJobTasks);
document.getElementById("process").addEventListener("click", processFile);
document.getElementById("dark-mode-switch").addEventListener("click", toggleTheme);
function selectFile() {
    ipcRenderer.invoke('select-translations', 'finished').then((result) => {
        if (!result.canceled) {
            document.getElementById("selected_file").innerHTML = result.filePaths[0];
        }
        else {
            new Toast('File Picker Cancelled');
        }
    });
}
function selectJobTasks() {
    ipcRenderer.invoke('select-to-be-translated', 'finished').then((result) => {
        if (!result.canceled) {
            document.getElementById("selected_jobtasks").innerHTML = result.filePaths[0];
        }
        else {
            new Toast('File Picker Cancelled');
        }
    });
}
function processFile() {
    let bar = new ProgressBar;
    const site_id = document.getElementById('siteSelect').value;
    if (site_id === '0') {
        bar.update(100, 'Please select a site');
        new Toast('Please select a site');
    }
    else {
        const worker = new WorkerHandler;
        const wb_translation = document.getElementById("selected_file").innerHTML;
        const wb_pms = document.getElementById("selected_jobtasks").innerHTML;
        bar.update(0, 'Processing Translations');
        worker.work([
            'translatepms',
            {
                wb_translation: wb_translation,
                wb_pms: wb_pms,
                siteid: site_id
            }
        ], showResults);
    }
}
function showResults(results) {
    let bar = new ProgressBar;
    bar.update(100, 'Done!');
}
function toggleTheme() {
    theme = document.getElementById("dark-mode-switch").checked ? "light" : "dark";
    let str = "[data-bs-theme=\"" + theme + "\"]";
    theme = document.getElementById("dark-mode-switch").checked ? "dark" : "light";
    //console.log(str);
    let elms = document.querySelectorAll(str);
    for (const elm of elms) {
        elm.setAttribute("data-bs-theme", theme);
    }
}
