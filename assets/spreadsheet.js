const xlsx = require('xlsx');

class ExcelReader {
    constructor() {
        this.workbook = xlsx.readFile("./assets/item_database.xlsm", {sheets:"Manufacturers",});
        // much faster to only read one sheet
    }

    getManufactures() {
        let worksheet = this.workbook.Sheets["Manufacturers"];
        let range = worksheet['!ref'];
        let lastrow = parseInt(range.split(':')[1].slice(1));
        let data = []
        for (let i=2;i<=lastrow;i++) {
            if (worksheet[`A${i}`]) {
                data.push([worksheet[`A${i}`].v, worksheet[`C${i}`].v, worksheet[`E${i}`]?.v ?? null])
            }
        }
        return data
    }
}

module.exports = ExcelReader
