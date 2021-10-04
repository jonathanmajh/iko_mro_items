document.getElementById("translate-single").addEventListener("click", testFunction);
document.getElementById("translate-batch").addEventListener("click", batchTranslate);

function testFunction() {
    let filePath = 'C:\\Users\\majona\\Documents\\TestFileTranslation.xlsx'
    const worker = new WorkerHandler;
    worker.work(['refreshTranslations', filePath]);
}

function batchTranslate() {
    let filePath = 'C:\\Users\\majona\\Documents\\TestFileTranslationDescription.xlsx'
    let params = {
        filePath: filePath,
        wsname: document.getElementById("ws-name").value || document.getElementById("ws-name").placeholder,
        maxNumCol: (document.getElementById("max-num").value || document.getElementById("max-num").placeholder).toUpperCase(),
        descriptions: (document.getElementById("input-col").value || document.getElementById("input-col").placeholder).replaceAll(" ", "").toUpperCase().split(","),
        manufacturerer: (document.getElementById("input-manu-col").value || document.getElementById("input-manu-col").placeholder).toUpperCase(),
        startingRow: parseInt(document.getElementById("start-row").value || document.getElementById("start-row").placeholder)
    }
    const worker = new WorkerHandler;
    worker.work(['batchTranslate', params]);
}