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

    getDescriptions() {
        let workbook = xlsx.readFile(this.filePath, {sheets:"Validate",});
        // open first worksheet if validate does not exist
        let worksheet = workbook.Sheets["Validate"];
        let range = worksheet['!ref'];
        let lastrow = parseInt(range.split(':')[1].slice(1));
        let data = []
        for (let i=3;i<=lastrow;i++) {
            if (worksheet[`A${i}`]) {
                data.push({'value': worksheet[`A${i}`].v, 'messages': '', 'row': i, 'result': []});
            } else if (worksheet[`B${i}`]) {
                let value = worksheet[`B${i}`].v
                if (worksheet[`C${i}`]) {
                    value = `${value},${worksheet[`C${i}`].v}`;
                }
                if (worksheet[`D${i}`]) {
                    value = `${value},${worksheet[`D${i}`].v}`;
                }
                data.push({'value': value, 'messages': '', 'row': i, 'result': []});
            }
        }
        return data
    }

    writeDescriptions(descriptions, savePath) {
        let workbook = xlsx.readFile(this.filePath, {cellStyles: true, bookVBA: true});
        // open first worksheet if validate does not exist
        let worksheet = workbook.Sheets["Validate"];
        descriptions.forEach(description => {
            worksheet[`E${description.row}`] = {t: 's', v: description.result[3], w: undefined}; //maximo description
            worksheet[`F${description.row}`] = {t: 's', v: description.result[0], w: undefined}; //main description
            worksheet[`G${description.row}`] = {t: 's', v: description.result[1], w: undefined}; //ext1
            worksheet[`H${description.row}`] = {t: 's', v: description.result[2], w: undefined}; //ext2
            worksheet[`I${description.row}`] = {t: 's', v: description.messages, w: undefined}; //msg 
        });
        xlsx.writeFile(workbook, savePath);
    }
}

module.exports = ExcelReader
