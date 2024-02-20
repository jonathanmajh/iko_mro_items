"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const Exceljs = require('exceljs');
const fs = require('fs');
const dt = require('luxon');
/**
  * class for reading data from excel item cache
  */
class ExcelReader {
    constructor(filePath) {
        this.filePath = filePath;
    }
    // the version number of the workbook is saved in a cell for tracking purposes
    getVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            const wb = new Exceljs.Workbook();
            yield wb.xlsx.readFile(this.filePath);
            const ws = wb.getWorksheet('Sheet2');
            const version = dt.DateTime.fromSeconds((parseFloat(ws.getCell('A2').text) - 25569) * 86400 + 14400).toFormat('yyyy-LL-dd HH:mm:ss');
            return version;
        });
    }
    // read information about the item database (an initial file is included for
    // faster startup rather than fetching all 100k+ items from maximo directly)
    /**
    * read the item cache file
    */
    getItemCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const wb = new Exceljs.Workbook();
            yield wb.xlsx.readFile(this.filePath);
            // read inventory data which will be appended to ext_search_text
            const ws3 = wb.getWorksheet('Sheet3');
            let lastRow = ws3.lastRow.number;
            const inventoryData = new Map();
            const allInventory = [];
            for (let i = 2; i <= lastRow; i++) {
                const row = [];
                row[0] = ws3.getCell(`A${i}`).text;
                row[1] = ws3.getCell(`B${i}`).text;
                row[2] = ws3.getCell(`C${i}`).text;
                row[3] = ws3.getCell(`D${i}`).text;
                row[4] = ws3.getCell(`E${i}`).text;
                row[5] = ws3.getCell(`F${i}`).text;
                row[6] = ws3.getCell(`G${i}`).text;
                row[7] = ws3.getCell(`I${i}`).text;
                allInventory.push([...row, ws3.getCell(`H${i}`).text]);
                if (row[2].length > 0 || row[3].length > 0 || row[4].length > 0 || row[5].length > 0 || row[6].length > 0) {
                    if (inventoryData.has(row[0])) {
                        for (let j = 1; j <= 7; j++) {
                            if (row[j].length > 0 && row[j] != 'NULL') {
                                inventoryData.get(row[0])[j] = inventoryData.get(row[0])[j] + '|' + row[j];
                            }
                        }
                    }
                    else {
                        for (let j = 2; j <= 7; j++) {
                            if (row[j] == 'NULL') {
                                row[j] = '';
                            }
                        }
                        inventoryData.set(row[0], row);
                    }
                }
            }
            // read item master data
            const ws = wb.getWorksheet('Sheet1'); // alternatively (fetch by ID): getWorksheet(1);
            lastRow = ws.lastRow.number; // last cell row in range
            const data = []; // empty list
            for (let i = 2; i <= lastRow; i++) {
                try {
                    data.push([
                        ws.getCell(`A${i}`).text,
                        ws.getCell(`B${i}`).text,
                        dt.DateTime.fromSeconds((parseFloat(ws.getCell(`C${i}`).text) - 25569) * 86400 + 14400).toFormat('yyyy-LL-dd HH:mm:ss'),
                        ws.getCell(`D${i}`).text,
                        ws.getCell(`E${i}`).text,
                        ws.getCell(`F${i}`).text,
                        ws.getCell(`H${i}`).text,
                        inventoryData.get(ws.getCell(`A${i}`).text),
                    ]);
                }
                catch (error) {
                    console.log(error);
                    console.log(`row number: ${i}`);
                }
            }
            const ws2 = wb.getWorksheet('Sheet2');
            return [
                data,
                dt.DateTime.fromSeconds((parseFloat(ws2.getCell('A2').text) - 25569) * 86400 + 14400).toFormat('yyyy-LL-dd HH:mm:ss'),
                allInventory,
            ];
            // to convert excel datetime in number format to string
        });
    }
    // get inital list of manufacturers from the workbook
    getManufactures() {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new Exceljs.Workbook();
            yield workbook.xlsx.readFile(this.filePath);
            const worksheet = workbook.getWorksheet('Manufacturers');
            const lastrow = worksheet.lastRow.number;
            const data = [];
            for (let i = 2; i <= lastrow; i++) {
                if (worksheet.getCell(`A${i}`).text) {
                    data.push([
                        worksheet.getCell(`A${i}`).text,
                        dt.DateTime.fromSeconds((parseFloat(worksheet.getCell(`B${i}`).text) - 25569) * 86400 + 14400).toFormat('yyyy-LL-dd HH:mm:ss'),
                        worksheet.getCell(`C${i}`).text,
                        worksheet.getCell(`D${i}`).text,
                    ]);
                }
            }
            return data;
        });
    }
    // get initial list of abbreviations from the workbook
    getAbbreviations() {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new Exceljs.Workbook();
            yield workbook.xlsx.readFile(this.filePath);
            const worksheet = workbook.getWorksheet('Replacements');
            const lastrow = worksheet.lastRow.number;
            const data = [];
            for (let i = 3; i <= lastrow; i++) {
                if (worksheet.getCell(`D${i}`).text) {
                    data.push([worksheet.getCell(`D${i}`).text, worksheet.getCell(`B${i}`).text]);
                }
            }
            return data;
        });
    }
    // read item information from workbook being processed
    getDescriptions(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new Exceljs.Workbook();
            yield workbook.xlsx.readFile(this.filePath);
            fs.copyFileSync(this.filePath, `${this.filePath}.backup`);
            postMessage(['info', `Backing up file as: "${this.filePath}.backup"`]);
            const wsNames = workbook.worksheets.map(function (ele) {
                return ele.name;
            });
            if (!wsNames.includes(params.wsName)) {
                postMessage(['info', 'Workbook has the following worksheets:']);
                postMessage(['info', `${wsNames}`]);
                postMessage([
                    'error',
                    `"${params.wsName} does not exist, Please check spelling & captitalization"`,
                ]);
                return false;
            }
            const worksheet = workbook.getWorksheet(params.wsName);
            const lastrow = worksheet.lastRow.number;
            const data = [];
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
        });
    }
    // write validated item information to the workbook
    // not used
    writeDescriptions(descriptions, savePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = xlsx.readFile(this.filePath, { cellStyles: true, bookVBA: true });
            const worksheet = workbook.Sheets['Validate'];
            descriptions.forEach((description) => {
                worksheet[`E${description.row}`] = { t: `s`, v: description.result[3], w: undefined }; // maximo description
                worksheet[`F${description.row}`] = { t: `s`, v: description.result[0], w: undefined }; // main description
                worksheet[`G${description.row}`] = { t: `s`, v: description.result[1], w: undefined }; // ext1
                worksheet[`H${description.row}`] = { t: `s`, v: description.result[2], w: undefined }; // ext2
                worksheet[`I${description.row}`] = { t: `s`, v: description.messages, w: undefined }; // msg
            });
            try {
                xlsx.writeFile(workbook, savePath);
            }
            catch (error) {
                console.log(error);
                const suffix = Date.now();
                savePath = savePath.split(`.`);
                savePath = `${savePath[0]}${suffix}.${savePath[1]}`;
                xlsx.writeFile(workbook, savePath);
            }
            return savePath;
        });
    }
    saveDescription(parmas) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new Exceljs.Workbook();
            yield workbook.xlsx.readFile(this.filePath);
            const worksheet = workbook.getWorksheet(parmas[0].wsName);
            worksheet.getCell(`${parmas[0].outItemDesc[0]}${parmas[0].outRow}`).value = parmas[1][0]; // description1
            worksheet.getCell(`${parmas[0].outItemDesc[1]}${parmas[0].outRow}`).value = parmas[1][1]; // description2
            worksheet.getCell(`${parmas[0].outItemDesc[2]}${parmas[0].outRow}`).value = parmas[1][2]; // manufacturer
            worksheet.getCell(`${parmas[0].outUOM}${parmas[0].outRow}`).value = parmas[0].uom; // uom
            worksheet.getCell(`${parmas[0].outComm}${parmas[0].outRow}`).value = parmas[0].commGroup; // c-group
            // worksheet.getCell(`${parmas[0].outItemDesc[2]}${parmas[0].outRow}`).value = parmas[1][2]; //c-code
            worksheet.getCell(`${parmas[0].outGL}${parmas[0].outRow}`).value = parmas[0].glClass; // gl-class
            worksheet.getCell(`${parmas[0].outTranslate}${parmas[0].outRow}`).value =
                'placeholder-translated'; // translated
            worksheet.getCell(`${parmas[0].outMissing}${parmas[0].outRow}`).value =
                'placeholder-missing'; // missing
            // worksheet.getCell(`${parmas[0].outItemDesc[2]}${parmas[0].outRow}`).value = parmas[1][2]; //question
            yield this.saveWorkbook(workbook, this.filePath);
        });
    }
    saveNumber(parmas) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new Exceljs.Workbook();
            yield workbook.xlsx.readFile(this.filePath);
            const worksheet = workbook.getWorksheet(parmas[1]);
            worksheet.getCell(`${parmas[3]}${parmas[2]}`).value = parmas[4];
            return yield this.saveWorkbook(workbook, this.filePath);
        });
    }
    saveNonInteractive(parmas, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // convert to batch mode, individually it is too slow
            const workbook = new Exceljs.Workbook();
            yield workbook.xlsx.readFile(this.filePath);
            const worksheet = workbook.getWorksheet(parmas[0].wsName);
            for (const item of data) {
                item.analysis = JSON.parse(item.analysis);
                if (item.analysis.related) {
                    worksheet.getCell(`${parmas[0].outItemNum}${item.row}`).value =
                        item.analysis.related; // itemnum
                    worksheet.getCell(`${parmas[0].outItemDesc[0]}${item.row}`).value =
                        item.description;
                }
                if (item.analysis.translate) {
                    worksheet.getCell(`${parmas[0].outTranslate}${item.row}`).value =
                        item.analysis.translate.description; // translated description
                    worksheet.getCell(`${parmas[0].outMissing}${item.row}`).value =
                        item.analysis.translate.missing.join('|'); // missing translations windows wants \r\n instead of just \n
                }
                // worksheet.getCell(`${parmas[0].outItemDesc}${item.row}`).value = parmas[2]; // en description
            }
            return yield this.saveWorkbook(workbook, this.filePath);
        });
    }
    saveWorkbook(workbook, savePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield workbook.xlsx.writeFile(savePath);
            }
            catch (error) {
                console.log(error);
                postMessage([`error`, `Cannot edit old file make sure it is closed`]);
            }
            return savePath;
        });
    }
    getColumnByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const wb = new Exceljs.Workbook();
            yield wb.xlsx.readFile(this.filePath);
            const ws = wb.getWorksheet('Sheet1');
            let match;
            ws.eachRow((row) => row.eachCell((cell) => {
                if (cell.names.find((n) => n === name)) {
                    match = cell;
                }
            }));
            return match;
        });
    }
}
module.exports = ExcelReader;
