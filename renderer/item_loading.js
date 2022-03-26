const ipc = require('electron').ipcRenderer;

document.addEventListener('DOMContentLoaded', function () {
    const worker = new WorkerHandler();

    version = ipc.sendSync('getVersion');
    worker.work(['checkItemCache', version], openMain);

    function openMain() {
        ipc.send('loading', 'finished');
    }
});
