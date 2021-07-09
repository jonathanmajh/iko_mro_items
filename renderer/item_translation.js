document.getElementById("translate-single").addEventListener("click", testFunction);

function testFunction() {
    let filepath = 'C:\\Users\\majona\\Documents\\TestFileTranslation.xlsx'
    const worker = new WorkerHandler;
    worker.work(['refreshTranslations', filepath]);
}