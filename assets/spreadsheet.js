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
        let version = dt.DateTime.fromSeconds((parseFloat(ws.getCell('A2').text)-25569)*86400+14400).toFormat('yyyy-LL-dd HH:mm:ss');
        return version;
    }

    // read information about the item database (an initial file is included for 
    // faster startup rather than fetching all 100k+ items from maximo directly)
    async getItemCache() {
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet('Sheet1'); //alternatively (fetch by ID): getWorksheet(1); 
        const lastRow = ws.lastRow.number; //last cell row in range 
        const data = []; //empty list
        for (let i = 2; i <= lastRow; i++) {
            try {
                data.push([
                    ws.getCell(`A${i}`).text,
                    ws.getCell(`B${i}`).text, 
                    dt.DateTime.fromSeconds((parseFloat(ws.getCell(`C${i}`).text)-25569)*86400+14400).toFormat('yyyy-LL-dd HH:mm:ss'),
                    ws.getCell(`D${i}`).text,
                    ws.getCell(`E${i}`).text,
                    ws.getCell(`F${i}`).text
                ]);
            } catch (error) {
                console.log(error);
                console.log(`row number: ${i}`);
            }
        }
        const ws2 = wb.getWorksheet('Sheet2');
        return [data, dt.DateTime.fromSeconds((parseFloat(ws2.getCell('A2').text)-25569)*86400+14400).toFormat('yyyy-LL-dd HH:mm:ss')];
        // to convert excel datetime in number format to string
    }

    // get inital list of manufacturers from the workbook
    async getManufactures() {
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        let worksheet = workbook.getWorksheet("Manufacturers");
        let lastrow = worksheet.lastRow.number;
        let data = [];
        for (let i = 2; i <= lastrow; i++) {
            if (worksheet.getCell(`A${i}`).text) {
                data.push([worksheet.getCell(`A${i}`).text, worksheet.getCell(`C${i}`).text, null, null]);
            }
        }
        return data;
    }

    //get initial list of abbreviations from the workbook
    async getAbbreviations() {
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        let worksheet = workbook.getWorksheet("Replacements");
        let lastrow = worksheet.lastRow.number;
        let data = [];
        for (let i = 3; i <= lastrow; i++) {
            if (worksheet.getCell(`D${i}`).text) {
                data.push([worksheet.getCell(`D${i}`).text, worksheet.getCell(`B${i}`).text]);
            }
        }
        return data;
    }

    // read item information from workbook being processed
    async getDescriptions(params) {
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        fs.copyFileSync(this.filePath, `${this.filePath}.backup`);
        postMessage(['info', `Backing up file as: "${this.filePath}.backup"`]);
        const wsNames = workbook.worksheets.map(function (ele) {return ele.name;});
        if (!(wsNames.includes(params.wsName))) {
            postMessage(['info', 'Workbook has the following worksheets:']);
            postMessage(['info', `${wsNames}`]);
            postMessage(['error', `"${params.wsName} does not exist, Please check spelling & captitalization"`]);
            return false;
        }
        let worksheet = workbook.getWorksheet(params.wsName);
        let lastrow = worksheet.lastRow.number;
        let data = [];
        let row = [];
        for (let i = params.startRow; i <= lastrow; i++) {
            row = [];
            for (let j = 0; j < params.inDesc.length; j++) {
                if (worksheet.getCell(`${params.inDesc[j]}${i}`).text) {
                    row.push(worksheet.getCell(`${params.inDesc[j]}${i}`).text);
                }
            }
            data.push([i, row.join()]);
        }
        return data;
    }

    // write validated item information to the workbook
    // not used
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
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        let worksheet = workbook.getWorksheet(parmas[0].wsName);
        worksheet.getCell(`${parmas[0].outDesc[1]}${parmas[0].outRow}`).value = parmas[1][0];
        worksheet.getCell(`${parmas[0].outDesc[2]}${parmas[0].outRow}`).value = parmas[1][1];
        worksheet.getCell(`${parmas[0].outDesc[3]}${parmas[0].outRow}`).value = parmas[1][2];
        worksheet.getCell(`${parmas[0].outDesc[0]}${parmas[0].outRow}`).value = parmas[1][3];
        await this.saveWorkbook(workbook, this.filePath);
    }

    // TODO switch to new library
    async saveNumber(parmas) {
        let workbook = xlsx.readFile(this.filePath, { cellStyles: true, bookVBA: true });
        let worksheet = workbook.Sheets[parmas[1]];
        worksheet[`${parmas[3][0]}${parmas[2]}`] = { t: `s`, v: parmas[4][1], w: undefined };
        worksheet[`${parmas[3][1]}${parmas[2]}`] = { t: `s`, v: parmas[4][0], w: undefined };
        let savePath = parmas[0];
        return await this.saveWorkbook(workbook, savePath);
    }

    async saveNonInteractive(parmas) {
        // convert to batch mode, individually it is too slow
        let workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(this.filePath);
        let worksheet = workbook.getWorksheet(parmas[4].wsName);
        worksheet.getCell(`${parmas[4].outItemNum}${parmas[5]}`).value = parmas[0]; // itemnum
        worksheet.getCell(`${parmas[4].outItemDesc}${parmas[5]}`).value = parmas[2]; // en description
        worksheet.getCell(`${parmas[4].outTranslate}${parmas[5]}`).value = parmas[1].description; // translated description
        worksheet.getCell(`${parmas[4].outMissing}${parmas[5]}`).value = parmas[1].missing.join(`\r\n`); // missing translations windows wants \r\n instead of just \n
        return await this.saveWorkbook(workbook, this.filePath);
    }

    async saveWorkbook(workbook, savePath) {
        try {
            await workbook.xlsx.writeFile(savePath);
        } catch (error) {
            console.log(error);
            postMessage([`error`, `Cannot edit old file make sure it is closed`]);
        }
        return savePath;
    }
}

module.exports = ExcelReader;

