const xlsx = require('xlsx');
// TODO switch to using exceljs instead of sheetjs since sheetjs locks styles behind the pro version paywall

class ExcelReader {
    constructor(filePath) {
        this.filePath = filePath
        // much faster to only read one sheet
    }

    getManufactures() {
        let workbook = xlsx.readFile(this.filePath, {sheets:"Manufacturers",});
        let worksheet = workbook.Sheets["Manufacturers"];
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

    getAbbreviations() {
        let workbook = xlsx.readFile(this.filePath, {sheets:"Abbreviations",});
        let worksheet = workbook.Sheets["Abbreviations"];
        let range = worksheet['!ref'];
        let lastrow = parseInt(range.split(':')[1].slice(1));
        let data = []
        for (let i=3;i<=lastrow;i++) {
            if (worksheet[`A${i}`]) {
                data.push([worksheet[`A${i}`].v, worksheet[`B${i}`].v])
            }
        }
        return data
    }

    getDescriptions(wsName, columns, startRow) {
        let workbook = xlsx.readFile(this.filePath);
        // error if workbook does not exist
        let worksheet = workbook.Sheets[wsName];
        let range = worksheet['!ref'];
        let lastrow = parseInt(range.split(':')[1].slice(1));
        let data = [];
        let row = [];
        for (let i=startRow;i<=lastrow;i++) {
            row = [];
            for (let j=0;j<columns.length;j++) {
                if (worksheet[`${columns[j]}${i}`]) {
                    row.push(worksheet[`${columns[j]}${i}`].v);
                }
            }
            data.push(row);
        }
        return data;
    }

    writeDescriptions(descriptions, savePath) {
        let workbook = xlsx.readFile(this.filePath, {cellStyles: true, bookVBA: true});
        // rewrite to use custom columns
        let worksheet = workbook.Sheets["Validate"];
        descriptions.forEach(description => {
            worksheet[`E${description.row}`] = {t: 's', v: description.result[3], w: undefined}; //maximo description
            worksheet[`F${description.row}`] = {t: 's', v: description.result[0], w: undefined}; //main description
            worksheet[`G${description.row}`] = {t: 's', v: description.result[1], w: undefined}; //ext1
            worksheet[`H${description.row}`] = {t: 's', v: description.result[2], w: undefined}; //ext2
            worksheet[`I${description.row}`] = {t: 's', v: description.messages, w: undefined}; //msg 
        });
        try {
            xlsx.writeFile(workbook, savePath);
        } catch (error) {
            console.log(error);
            const suffix = Date.now();
            savePath = savePath.split('.');
            savePath = `${savePath[0]}${suffix}.${savePath[1]}`;
            xlsx.writeFile(workbook, savePath);
        }
        return savePath;
    }
}

module.exports = ExcelReader
