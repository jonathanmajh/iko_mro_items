const ipc = require('electron').ipcRenderer;

document.addEventListener('DOMContentLoaded', function () {
    const worker = new WorkerHandler;
    worker.work(['checkItemCache'], openMain);

    function openMain() {
        ipc.send('loading', 'finished');
    }
});


class WorkerHandler {
    async work(params, callback) {
        const worker = new Worker('./worker.js');
        worker.postMessage(params);
        worker.onmessage = (e) => {
            let log = new Logging();
            if (e.data[0] === 'result') {
                worker.terminate()
                callback(e.data.slice(1,));
            } else if (e.data[0] === 'error') {
                log.error(e.data[1]);
                worker.terminate()
            } else if (e.data[0] === 'progress') {
                log.info(e.data[2]);
            } else if (e.data[0] === 'warning') {
                log.warning(e.data[1]);
            } else if (e.data[0] === 'info') {
                log.info(e.data[1]);
            } else if (e.data[0] === 'debug') {
                log.info(e.data[1]);
            } else {
                console.log('unimplemented worker message');
                console.log(e.data);
            }
        }
    }
}

class Logging {
    constructor() {
        this.logTable = document.getElementById("logs-table")
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
        row.classList.add("table-info");
    }
}