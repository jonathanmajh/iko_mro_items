const Exceljs = require('exceljs')

class SpreadsheetUpdated {
    constructor(filePath){
        this.filePath = filePath;
    }

    // the version number of the workbook is saved in a cell for tracking purposes
    async getVersion() {
        const wb = new Exceljs.workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet('Sheet1');
        const version = worksheet.getCell('F2').value;
        return version;
    }

    // read information about the item database (an initial file is included for 
    // faster startup rather than fetching all 100k+ items from maximo directly)
    getItemCache() {
        const wb = new Exceljs.workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet('Sheet1');
        const range = xlsx.utils.decode_range(ws['!ref']);
        const lastRow = range.e.r + 1;
        const data = []

        for (let i=2;i<=lastrow;i++) {
            if (worksheet[`A${i}`]) {
                try {
                    data.push([worksheet[`A${i}`].v, worksheet[`B${i}`].v, worksheet[`C${i}`].w])
                } catch (error) {
                    console.log(error);
                    console.log(`row number: ${i}`);
                }
                
            }
        }
        return [data, worksheet['F2'].w]
    }

    // get inital list of manufacturers from the workbook
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

    //get initial list of abbirvations from the workbook
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

    // read item information from workbook being processed
    getDescriptions(wsName, columns, startRow) {
        let workbook = xlsx.readFile(this.filePath);
        fs.copyFileSync(this.filePath, `${this.filePath}.backup`);
        postMessage(['info', `Backing up file as: "${this.filePath}.backup"`]);
        if (!(workbook.SheetNames.includes(wsName))) {
            postMessage(['info', `Workbook has the following worksheets:`]);
            postMessage(['info', `${workbook.SheetNames}`]);
            postMessage(['error', `"${wsName} does not exist, Please check spelling & captitalization"`]);
            return false;
        }
        let worksheet = workbook.Sheets[wsName];
        let range = xlsx.utils.decode_range(worksheet['!ref']);
        let lastrow = range.e.r + 1;
        let data = [];
        let row = [];
        for (let i=startRow;i<=lastrow;i++) {
            row = [];
            for (let j=0;j<columns.length;j++) {
                if (worksheet[`${columns[j]}${i}`]) {
                    row.push(worksheet[`${columns[j]}${i}`].v);
                }
            }
            data.push([i, row.join()]);
        }
        return data;
    }

    // write validated item information to the workbook
    writeDescriptions(descriptions, savePath) {
        let workbook = xlsx.readFile(this.filePath, {cellStyles: true, bookVBA: true});
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

    async saveDescription(parmas) {
        let workbook = xlsx.readFile(this.filePath, {cellStyles: true, bookVBA: true});
        let worksheet = workbook.Sheets[parmas[1]];
        worksheet[`${parmas[3][2]}${parmas[2]}`] = {t: 's', v: parmas[4][0], w: undefined};
        worksheet[`${parmas[3][3]}${parmas[2]}`] = {t: 's', v: parmas[4][1], w: undefined};
        worksheet[`${parmas[3][4]}${parmas[2]}`] = {t: 's', v: parmas[4][2], w: undefined};
        worksheet[`${parmas[3][1]}${parmas[2]}`] = {t: 's', v: parmas[4][3], w: undefined};
        let savePath = parmas[0]
        return await this.saveWorkbook(workbook, savePath);
    }

    async saveNumber(parmas) {
        let workbook = xlsx.readFile(this.filePath, {cellStyles: true, bookVBA: true});
        let worksheet = workbook.Sheets[parmas[1]];
        worksheet[`${parmas[3][0]}${parmas[2]}`] = {t: 's', v: parmas[4][1], w: undefined};
        worksheet[`${parmas[3][1]}${parmas[2]}`] = {t: 's', v: parmas[4][0], w: undefined};
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
                    postMessage(['error', 'Cannot edit old file make sure it is closed']);
                } else {
                    xlsx.writeFile(workbook, savePath);
                }
            });
        }
        return savePath;
    }
}

module.exports = ExcelReader
