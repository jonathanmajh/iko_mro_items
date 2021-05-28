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
        let rowCount;
        if (data.domainDef.changes) {
            rowCount = 3;
            ws = wb.addWorksheet('ChangeCondDomDef');
            row = ws.getRow(1);
            row.values = ['IKO_Import','IKO_ALNDOMAIN','AddChange','EN'];
            row = ws.getRow(2);
            row.values = ['DOMAINID','DESCRIPTION','DOMAINTYPE','MAXTYPE','LENGTH'];
            for (const change of data.domainDef.changes) {
                row = ws.getRow(rowCount);
                row.values = [change.list_id, change.inspect, 'ALN', 'UPPER', '3'];
                rowCount++;
            }
        }
        if (data.domainDef.delete) {
            ws = wb.addWorksheet('RemoveCondDomDef');
            row = ws.getRow(1);
            row.values = ['DOMAINID'];
            rowCount = 2;
            for (const change of data.domainDef.delete) {
                row = ws.getRow(rowCount);
                row.values = [change];
                rowCount++;
            }
        }
        if (data.domainVal.changes) {
            let rowCount = 3;
            ws = wb.addWorksheet('ChangeCondDomVal');
            row = ws.getRow(1);
            row.values = ['IKO_Import','IKO_ALNDOMAIN','AddChange','EN'];
            row = ws.getRow(2);
            row.values = ['DOMAINID','VALUE','AD_DESCRIPTION'];
            for (const observ of data.domainVal.changes) {
                row = ws.getRow(rowCount);
                row.values = [observ.meter, observ.id_value, observ.observation];
                rowCount++;
            }
        }
        if (data.domainVal.delete) {
            ws = wb.addWorksheet('RemoveCondDomVal');
            row = ws.getRow(1);
            row.values = ['DOMAINID:VALUE'];
            rowCount = 2;
            for (const change of data.domainVal.delete) {
                row = ws.getRow(rowCount);
                row.values = [change];
                rowCount++;
            }
        }
        if (data.meter.changes) {
            let rowCount = 3;
            ws = wb.addWorksheet('ChangeCondMeter');
            row = ws.getRow(1);
            row.values = ['IKO_Import','IKO_METER','AddChange','EN'];
            row = ws.getRow(2);
            row.values = ['METERNAME','DESCRIPTION','METERTYPE','DOMAINID'];
            for (const observ of data.meter.changes) {
                row = ws.getRow(rowCount);
                row.values = [`${observ.list_id.slice(2)}01`, observ.inspect, 'CHARACTERISTIC', observ.list_id];
                rowCount++;
            }
        }
        if (data.meter.delete) {
            ws = wb.addWorksheet('RemoveCondMeter');
            row = ws.getRow(1);
            row.values = ['DOMAINID'];
            rowCount = 2;
            for (const change of data.meter.delete) {
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
                        search_str: `${meter}~${temp1}`
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
                    search_str: `${meter}~${temp1}`
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