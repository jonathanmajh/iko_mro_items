
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
        row.classList.add("table-info");
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

function toTop() {
    let element = document.getElementsByClassName("flex-shrink-0");
    element[0].scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function toEnd() {
    let element = document.getElementsByClassName("flex-shrink-0");
    element[0].scrollTop = element[0].scrollHeight; // For Chrome, Firefox, IE and Opera
}

