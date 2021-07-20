const Exceljs = require('exceljs')

class Spreadsheet {
    constructor(filePath) {
        this.filePath = filePath;
    }

    async getDescriptions(params) {
        // returns all the english descriptions on a workbook
        // {wsname:string, maxNumCol:string, description:[string], manufacturerer: string, startingRow: int}
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.getWorksheet(params.wsname);
        const lastRow = ws.lastRow.number;
        let descriptions = [];
        let description = "";
        for (let i = params.startingRow; i <= lastRow; i++) {
            for (const col of params.descriptions) {
                description = `${description},${ws.getCell(`${col}${i}`).text}`
            }
            descriptions.push({
                maxNum: ws.getCell(`${params.maxNumCol}${i}`).text,
                description: description,
                manufacturer: ws.getCell(`${params.manufacturerer}${i}`, ).text
            })
            description = "";
        }
        return descriptions
    }

    async getTranslations() {
        // read all translation definitions from a workbook for import
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.worksheets[0]; //assume there is only 1 worksheet and its the one we want
        const lastRow = ws.lastRow.number;
        const languages = ws.getRow(1).cellCount;
        let lang_codes = []
        for (let i = 2; i <= languages; i++) {
            lang_codes.push(ws.getCell(1, i).text)
        }
        let translations = [];
        for (let i = 2; i <= lastRow; i++) {
            for (let j = 2; j <= languages; j++) {
                translations.push({
                    english: ws.getCell(i, 1).text,
                    lang_code: lang_codes[j - 2],
                    translation: ws.getCell(i, j).text
                })
            }
        }
        return translations
    }

    async saveTranslations(data) {
        // save translated descriptions to excel file
        // multiple worksheets one for each language, and one for missing words
        const wb = new Exceljs.Workbook();
        let ws;
        let row;
        let rowCount;
        debugger;
        for (const lang of data.langs) {
            rowCount = 2;
            ws = wb.addWorksheet(lang);
            row = ws.getRow(1);
            row.values = ['Maximo Item Number', 'English Description', `${lang} Description`, 'Manufacturer Name']
            for (const item of data.item) {
                row = ws.getRow(rowCount);
                row.values = [item.maxNum, item.description, item[lang], item.manufacturer || "-"];
                rowCount++;
            }
        }
        if (data.missing) {
            ws = wb.addWorksheet('Missing Translations');
            rowCount = 1;
            for (const change of data.missing) {
                row = ws.getRow(rowCount);
                row.values = [change];
                rowCount++;
            }
        }

        await wb.xlsx.writeFile(this.filePath);
        postMessage(['result', 'done'])
    }

    async saveObserListChanges(data) {
        // expected attributes for data: domain.changes, domain.delete
        // saves observation list changes data, expect data in object format
        const wb = new Exceljs.Workbook();
        let ws;
        let row;
        let rowCount;
        if (data.domainDef.changes) {
            rowCount = 3;
            ws = wb.addWorksheet('ChangeCondDomDef');
            row = ws.getRow(1);
            row.values = ['IKO_Import', 'IKO_ALNDOMAIN', 'AddChange', 'EN'];
            row = ws.getRow(2);
            row.values = ['DOMAINID', 'DESCRIPTION', 'DOMAINTYPE', 'MAXTYPE', 'LENGTH'];
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
            row.values = ['IKO_Import', 'IKO_ALNDOMAIN', 'AddChange', 'EN'];
            row = ws.getRow(2);
            row.values = ['DOMAINID', 'VALUE', 'AD_DESCRIPTION'];
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
            row.values = ['IKO_Import', 'IKO_METER', 'AddChange', 'EN'];
            row = ws.getRow(2);
            row.values = ['METERNAME', 'DESCRIPTION', 'METERTYPE', 'DOMAINID'];
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
        if (data.jobTask.changes) {
            let rowCount = 3;
            ws = wb.addWorksheet('ChangeJobTask');
            row = ws.getRow(1);
            row.values = ['IKO_Import', 'IKO_JOBTASK', 'AddChange', 'EN'];
            row = ws.getRow(2);
            row.values = [
                'ORGID', 'SITEID', 'JPNUM', 'PLUSCREVNUM', 'JPTASK',
                'PLUSCJPREVNUM', 'METERNAME', 'DESCRIPTION',
                'DESCRIPTION_LONGDESCRIPTION', '', 'OLD DESCRIPTION', 'OLD EXTENDED DESCRIPTION'
            ];
            for (const jobTask of data.jobTask.changes) {
                row = ws.getRow(rowCount);
                row.values = [
                    jobTask.orgid, jobTask.siteid, jobTask.jpnum,
                    0, jobTask.jptask, 0, jobTask.metername, jobTask.desc,
                    jobTask.ext_desc, '', jobTask.old_desc, jobTask.old_ext_desc
                ];
                rowCount++;
            }
        }
        if (data.jobTask.delete) {
            ws = wb.addWorksheet('RemoveJobTask');
            row = ws.getRow(1);
            row.values = [
                'ORGID', 'SITEID', 'JPNUM', 'PLUSCREVNUM', 'JPTASK',
                'PLUSCJPREVNUM', 'METERNAME', 'DESCRIPTION',
                'DESCRIPTION_LONGDESCRIPTION'
            ];
            rowCount = 2;
            for (const jobTask of data.jobTask.delete) {
                row = ws.getRow(rowCount);
                row.values = [
                    jobTask.orgid, jobTask.siteid, jobTask.jpnum,
                    0, jobTask.jptask, 0, jobTask.metername, jobTask.desc,
                    jobTask.ext_desc
                ];
                rowCount++;
            }
        }
        await wb.xlsx.writeFile(this.filePath);
        postMessage(['result', 'done'])
    }

    async getJobTasks() {
        // getting extended description from REST API takes way too long, so require a worksheet with information retrived from the DB
        // select jpnum, jptask, description, orgid, siteid, metername, ldtext from
        // (select jpnum, jptask, description, orgid, siteid, metername, jobtaskid from jobtask where metername is not null) as t1
        // left join 
        // (select ldtext, ldkey from longdescription where ldownertable = 'JOBTASK') as t2
        // on t1.jobtaskid = t2.ldkey
        const wb = new Exceljs.Workbook();
        await wb.xlsx.readFile(this.filePath);
        const ws = wb.worksheets[0]; //assume there is only 1 worksheet and its the one we want
        const lastRow = ws.lastRow.number;
        let row = ws.getRow(1).values.slice(1);
        let jobTasks = [];
        if (row.equals(['jpnum', 'jptask', 'description', 'orgid', 'siteid', 'metername', 'ldtext'])) {
            console.log('pass');
        } else {
            postMessage(['error', `Please Check Column Heading for JobTask Input expecting ${['jpnum', 'jptask', 'description', 'orgid', 'siteid', 'metername', 'ldtext']}`]);
        }
        for (let i = 2; i <= lastRow; i++) {
            row = ws.getRow(i).values;
            jobTasks.push({
                jpnum: row[1],
                metername: row[6],
                orgid: row[4],
                siteid: row[3],
                jptask: row[2],
                desc: row[3],
                ext_desc: row[7]
            })
        }
        return jobTasks
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
        ws.eachRow(function (row, rowNumber) {
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
    // when reading cells from a row object there is no option for removing richtext
    if (typeof (value) === "string") {
        return value;
    } else if (typeof (value) == "object") {
        let temp = "";
        for (const part of value.richText) temp = `${temp}${part.text}`
        return temp
    } else if (typeof (value) == "undefined") {
        return undefined
    } else {
        postMessage(['error', `Unknown cell type: ${typeof (value)}`]);
    }
}

//https://stackoverflow.com/a/14853974
// Warn if overriding existing method
// Check if two arrays are equal
if (Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

module.exports = Spreadsheet