const Exceljs = require('exceljs');
const fs = require('fs');
const dt = require('luxon');

class ExcelReader {
    constructor(filePath) {
        this.filePath = filePath;
    }

    // the version number of the workbook is saved in a cell for tracking purposes
    async getVersion() {
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet('Sheet2');
        let version = dt.DateTime.fromSeconds((parseFloat(ws.getCell('A2').text)-25569)*86400+14400).toFormat('yyyy-LL-dd HH:mm:ss')
        return version;
    }

    // read information about the item database (an initial file is included for 
    // faster startup rather than fetching all 100k+ items from maximo directly)
    async getItemCache() {
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet('Sheet1'); //alternatively (fetch by ID): getWorksheet(1); 
        const lastRow = ws.lastRow.number; //last cell row in range 
        const data = [] //empty list
        for (let i = 2; i <= lastRow; i++) {
            try {
                data.push([
                    ws.getCell(`A${i}`).text,
                    ws.getCell(`B${i}`).text, 
                    dt.DateTime.fromSeconds((parseFloat(ws.getCell(`C${i}`).text)-25569)*86400+14400).toFormat('yyyy-LL-dd HH:mm:ss'),
                    ws.getCell(`D${i}`).text,
                    ws.getCell(`E${i}`).text,
                    ws.getCell(`F${i}`).text
                ])
            } catch (error) {
                console.log(error);
                console.log(`row number: ${i}`);
            }
        }
        const ws2 = wb.getWorksheet('Sheet2');
        return [data, dt.DateTime.fromSeconds((parseFloat(ws2.getCell('A2').text)-25569)*86400+14400).toFormat('yyyy-LL-dd HH:mm:ss')]
        // to convert excel datetime in number format to string
    }

    // get inital list of manufacturers from the workbook
    async getManufactures() {
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        let worksheet = workbook.getWorksheet("Manufacturers");
        let lastrow = worksheet.lastRow.number;
        let data = []
        for (let i = 2; i <= lastrow; i++) {
            if (worksheet.getCell(`A${i}`).text) {
                data.push([worksheet.getCell(`A${i}`).text, worksheet.getCell(`C${i}`).text, worksheet.getCell(`E${i}`).text, null])
            }
        }
        return data
    }

    //get initial list of abbreviations from the workbook
    async getAbbreviations() {
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        let worksheet = workbook.getWorksheet("Abbreviations");
        let lastrow = worksheet.lastRow.number;
        let data = []
        for (let i = 3; i <= lastrow; i++) {
            if (worksheet.getCell(`A${i}`).text) {
                data.push([worksheet.getCell(`A${i}`).text, worksheet.getCell(`B${i}`).text])
            }
        }
        return data
    }

    // read item information from workbook being processed
    async getDescriptions(wsName, columns, startRow) {
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        fs.copyFileSync(this.filePath, `${this.filePath}.backup`);
        postMessage(['info', `Backing up file as: "${this.filePath}.backup"`]);
        const wsNames = workbook.worksheets.map(function (ele) {return ele.name;});
        if (!(wsNames.includes(wsName))) {
            postMessage(['info', 'Workbook has the following worksheets:']);
            postMessage(['info', `${wsNames}`]);
            postMessage(['error', `"${wsName} does not exist, Please check spelling & captitalization"`]);
            return false;
        }
        let worksheet = workbook.getWorksheet(wsName);
        let lastrow = worksheet.lastRow.number;
        let data = [];
        let row = [];
        for (let i = startRow; i <= lastrow; i++) {
            row = [];
            for (let j = 0; j < columns.length; j++) {
                if (worksheet.getCell(`${columns[j]}${i}`).text) {
                    row.push(worksheet.getCell(`${columns[j]}${i}`).text);
                }
            }
            data.push([i, row.join()]);
        }
        return data;
    }

    // write validated item information to the workbook
    async writeDescriptions(descriptions, savePath) {
        let workbook = xlsx.readFile(this.filePath, { cellStyles: true, bookVBA: true });
        let worksheet = workbook.Sheets["Validate"];
        descriptions.forEach(description => {
            worksheet[`E${description.row}`] = { t: `s`, v: description.result[3], w: undefined }; //maximo description
            worksheet[`F${description.row}`] = { t: `s`, v: description.result[0], w: undefined }; //main description
            worksheet[`G${description.row}`] = { t: `s`, v: description.result[1], w: undefined }; //ext1
            worksheet[`H${description.row}`] = { t: `s`, v: description.result[2], w: undefined }; //ext2
            worksheet[`I${description.row}`] = { t: `s`, v: description.messages, w: undefined }; //msg 
        });
        try {
            xlsx.writeFile(workbook, savePath);
        } catch (error) {
            console.log(error);
            const suffix = Date.now();
            savePath = savePath.split(`.`);
            savePath = `${savePath[0]}${suffix}.${savePath[1]}`;
            xlsx.writeFile(workbook, savePath);
        }
        return savePath;
    }

    async saveDescription(parmas) {
        let workbook = xlsx.readFile(this.filePath, { cellStyles: true, bookVBA: true });
        let worksheet = workbook.Sheets[parmas[1]];
        worksheet[`${parmas[3][2]}${parmas[2]}`] = { t: `s`, v: parmas[4][0], w: undefined };
        worksheet[`${parmas[3][3]}${parmas[2]}`] = { t: `s`, v: parmas[4][1], w: undefined };
        worksheet[`${parmas[3][4]}${parmas[2]}`] = { t: `s`, v: parmas[4][2], w: undefined };
        worksheet[`${parmas[3][1]}${parmas[2]}`] = { t: `s`, v: parmas[4][3], w: undefined };
        let savePath = parmas[0]
        return await this.saveWorkbook(workbook, savePath);
    }

    async saveNumber(parmas) {
        let workbook = xlsx.readFile(this.filePath, { cellStyles: true, bookVBA: true });
        let worksheet = workbook.Sheets[parmas[1]];
        worksheet[`${parmas[3][0]}${parmas[2]}`] = { t: `s`, v: parmas[4][1], w: undefined };
        worksheet[`${parmas[3][1]}${parmas[2]}`] = { t: `s`, v: parmas[4][0], w: undefined };
        let savePath = parmas[0]
        return await this.saveWorkbook(workbook, savePath);
    }

    async saveWorkbook(workbook, savePath) {
        try {
            xlsx.writeFile(workbook, savePath);
        } catch (error) {
            console.log(error);
            fs.unlink(savePath, (err) => {
                if (err) {
                    console.log(err)
                    postMessage([`error`, `Cannot edit old file make sure it is closed`]);
                } else {
                    xlsx.writeFile(workbook, savePath);
                }
            });
        }
        return savePath;
    }
}

module.exports = ExcelReader

