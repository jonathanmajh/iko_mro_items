const ExcelReader = require('../assets/spreadsheet')

class Sleep {
    constructor(ms) {
        const date = Date.now();
        console.log('sleep')
        let currentDate = null;
        do {
          currentDate = Date.now();
        } while (currentDate - date < ms);
        console.log('woke')
    }
}

onmessage = function(e) {
    console.log(e);
    new Sleep(5000);
    const excel = new ExcelReader();
    let data = excel.getManufactures();
    console.log(data);
    console.log('work is done, sending...');
    postMessage(data);
}
console.log('worker thread started')