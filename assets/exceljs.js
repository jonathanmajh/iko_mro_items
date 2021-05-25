const Exceljs = require('exceljs')

class Spreadsheet {
    constructor(filePath) {
        this.filePath = filePath;
    }

    async readObservList(wsname) {
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet(wsname);
        ws.eachRow(function(row, rowNumber) {
            postMessage(['debug', `Row#: ${rowNumber}, Values: ${JSON.stringify(row.values)}`]);
        })
    }
}

module.exports = Spreadsheet