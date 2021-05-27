const Exceljs = require('exceljs')

class Spreadsheet {
    constructor(filePath) {
        this.filePath = filePath;
    }

    async saveObserListChanges(data) {
        // expected attributes for data: domain.changes, domain.delete
        const wb = new Exceljs.Workbook();
        let ws;
        let row;
        let rowCount = 3;
        if (data.domain.changes) {
            ws = wb.addWorksheet('ChangeConditionDomainDefinitions');
            row = ws.getRow(1);
            row.values = ['IKO_Import','IKO_ALNDOMAIN','AddChange','EN'];
            row = ws.getRow(2);
            row.values = ['DOMAINID','DESCRIPTION','DOMAINTYPE','MAXTYPE','LENGTH'];
            for (const change of data.domain.changes) {
                row = ws.getRow(rowCount);
                row.values = [change.list_id, change.inspect, 'ALN', 'UPPER', '3'];
                rowCount++;
            }
        }
        if (data.domain.delete) {
            ws = wb.addWorksheet('RemoveConditionDomainDefinitions');
            row = ws.getRow(1);
            row.values = ['DOMAINID'];
            rowCount = 2;
            for (const change of data.domain.delete) {
                row = ws.getRow(rowCount);
                row.values = [change];
                rowCount++;
            }
        }
        await wb.xlsx.writeFile(this.filePath);
        postMessage(['result', 'done'])
    }

    async readObservList(wsname) {
        // loop through the excel sheet to extract information
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet(wsname);
        let meter = '';
        let meters = [];
        let observation = {};
        let observations = [];
        let inspect;
        let desc;
        let temp1;
        let temp2;
        let temp3;
        ws.eachRow(function(row, rowNumber) {
            if (row.values[1] !== undefined) {
                // check if row has meter definitions
                meter = removeRichText(row.values[1]);
                if (meters[meter]) {
                    postMessage(['error', `Duplicate Meter: ${meter} on Row: ${rowNumber}`]);
                } else {
                    inspect = removeRichText(row.values[3]);
                    desc = removeRichText(row.values[5]);
                    meters.push({
                        name: meter,
                        list_id: `M-${meter}`,
                        inspect: inspect,
                        desc: `Inspect ${inspect}`,
                        ext_desc: desc,
                        search_str: `M-${meter}~${inspect}`
                    })
                    temp1 = removeRichText(row.values[6]);
                    temp2 = removeRichText(row.values[7]);
                    temp3 = removeRichText(row.values[8]);
                    observation = {
                        meter: meter,
                        id_value: temp1,
                        observation: temp2,
                        action: temp3,
                        search_str: `${meter}~${temp1}~${temp2}`
                    }
                    observations.push(observation);  
                }
            } else if (row.values[6] !== undefined) {
                // it is just a observation row
                temp1 = removeRichText(row.values[6]);
                temp2 = removeRichText(row.values[7]);
                temp3 = removeRichText(row.values[8]);
                observation = {
                    meter: meter,
                    id_value: temp1,
                    observation: temp2,
                    action: temp3,
                    search_str: `${meter}~${temp1}~${temp2}`
                }
                observations.push(observation);
            }
        }) 
        postMessage(['result', [meters.slice(1), observations.slice(1)]]);
    }
}

function removeRichText(value) {
    if (typeof(value) === "string") {
        return value;
    } else if (typeof(value) == "object") {
        let temp = "";
        for (const part of value.richText) temp = `${temp}${part.text}`
        return temp
    } else if (typeof(value) == "undefined") {
        return undefined
    } else {
        postMessage(['error', `Unknown cell type: ${typeof(value)}`]);
    }
}

module.exports = Spreadsheet