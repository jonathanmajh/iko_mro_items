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
class AssetExcel {
    constructor(filePath) {
        this.filePath = filePath;
    }
    getAssetDescription(lang_code) {
        return __awaiter(this, void 0, void 0, function* () {
            const wb = new Exceljs.Workbook();
            yield wb.xlsx.readFile(this.filePath);
            const ws = wb.getWorksheet(lang_code.toUpperCase()); //alternatively (fetch by ID): getWorksheet(1); 
            const lastRow = ws.lastRow.number; //last cell row in range 
            const data = {};
            for (let i = 2; i <= lastRow; i++) {
                try {
                    if (ws.getCell(`A${i}`).text) {
                        data[`${lang_code}${ws.getCell(`A${i}`).text.toLowerCase().replace(/\s/g, " ").trim()}`] = {
                            translated: ws.getCell(`B${i}`).text,
                            siteid: ws.getCell(`C${i}`).text,
                            assetid: ws.getCell(`D${i}`).text,
                            description: ws.getCell(`A${i}`).text
                        };
                    }
                }
                catch (error) {
                    console.log(error);
                    console.log(`row number: ${i}`);
                }
            }
            return data;
        });
    }
    getDescriptors() {
        return __awaiter(this, void 0, void 0, function* () {
            const wb = new Exceljs.Workbook();
            yield wb.xlsx.readFile(this.filePath);
            const ws = wb.getWorksheet('Lookups'); //alternatively (fetch by ID): getWorksheet(1); 
            const lastRow = ws.lastRow.number; //last cell row in range 
            const data = { 'worktype': {}, 'labortype': {}, 'frequency': {}, 'sites': {} };
            for (let i = 1; i <= lastRow; i++) {
                try {
                    if (ws.getCell(`A${i}`).text) { //lang code, english desc - translated desc
                        data['worktype'][`${ws.getCell(`C${i}`).text}${ws.getCell(`A${i}`).text}`.toLowerCase()] = ws.getCell(`B${i}`).text;
                    }
                    if (ws.getCell(`F${i}`).text) {
                        data['labortype'][`${ws.getCell(`H${i}`).text}${ws.getCell(`F${i}`).text}`.toLowerCase()] = ws.getCell(`G${i}`).text;
                    }
                    if (ws.getCell(`K${i}`).text) {
                        data['frequency'][`${ws.getCell(`M${i}`).text}${ws.getCell(`K${i}`).text}`.toLowerCase()] = ws.getCell(`L${i}`).text;
                    }
                    if (ws.getCell(`P${i}`).text) { //sites
                        data['sites'][ws.getCell(`P${i}`).text.toLowerCase().trim()] = {
                            siteid: ws.getCell(`P${i}`).text.trim(),
                            description: ws.getCell(`Q${i}`).text,
                            orgid: ws.getCell(`R${i}`).text,
                            langcode: ws.getCell(`S${i}`).text
                        };
                    }
                }
                catch (error) {
                    console.log(error);
                    console.log(`row number: ${i}`);
                }
            }
            return data;
        });
    }
    ReadColumns(columns) {
        return __awaiter(this, void 0, void 0, function* () {
            // returns specified columns as a array of objects
            const wb = new Exceljs.Workbook();
            yield wb.xlsx.readFile(this.filePath);
            let wsDetails = { name: '', columns: [] };
            let colnum = 0;
            let data = [];
            let wsColumns;
            for (const ws in wb.worksheets) {
                wsDetails.name = wb.worksheets[ws].name;
                for (const column in columns) {
                    wsColumns = wb.worksheets[ws].getRow(1).values.map(function (x) { try {
                        return x.toLowerCase();
                    }
                    catch (err) {
                        undefined;
                    } });
                    // convert ws columns to lower case
                    colnum = wsColumns.indexOf(columns[column]);
                    if (colnum === -1) {
                        wsDetails.columns = {};
                        // if missing one column then go to next worksheet
                        break;
                    }
                    else {
                        wsDetails.columns[columns[column]] = colnum;
                    }
                }
                if (Object.keys(wsDetails.columns).length === columns.length) {
                    // if all columns are found then we can leave this loop
                    break;
                }
            }
            if (wsDetails.columns === {}) {
                console.log('error worksheet with specified columns does not exist');
            }
            else {
                const ws = wb.getWorksheet(wsDetails.name);
                const lastrow = ws.lastRow.number;
                let row;
                let blanks;
                for (let i = 2; i <= lastrow; i++) {
                    try {
                        row = {};
                        blanks = 0;
                        for (const column in wsDetails.columns) {
                            if (ws.getCell(i, wsDetails.columns[column]).value === null) {
                                blanks++;
                            }
                            row[column] = ws.getCell(i, wsDetails.columns[column]).value;
                        }
                        if (blanks === columns.length) {
                            console.log('blank row ignoring');
                        }
                        else {
                            data.push(row);
                        }
                    }
                    catch (err) {
                        console.log(err);
                        console.log(`row number: ${i}`);
                    }
                }
                return data;
            }
        });
    }
}
module.exports = AssetExcel;
