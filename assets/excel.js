const Exceljs = require('exceljs');
const fs = require('fs');
const report = require('./reporting');

// Convert an Excel serial date cell to 'yyyy-MM-dd HH:mm:ss' in local time.
// Replaces luxon DateTime.fromSeconds(...).toFormat(...): Excel serials count
// days since 1899-12-30, 25569 is the offset to the Unix epoch, and +14400s
// preserves the previous UTC-4 adjustment. Formatting uses local getters,
// matching luxon's default local-zone behavior.
function excelSerialToString(text) {
  const seconds = (parseFloat(text) - 25569) * 86400 + 14400;
  const d = new Date(seconds * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
  * Unified class for reading and writing Excel workbooks.
  *
  * Consolidates the former `ExcelReader` (item cache / batch processing) and
  * `Spreadsheet` (observation list / job task / translation import-export)
  * into a single API surface.
  */
class Spreadsheet {
  constructor(filePath) {
    this.filePath = filePath;
  }

  // the version number of the workbook is saved in a cell for tracking purposes
  async getVersion() {
    const wb = new Exceljs.Workbook();
    await wb.xlsx.readFile(this.filePath);
    const ws = wb.getWorksheet('Sheet2');
    const version = excelSerialToString(ws.getCell('A2').text);
    return version;
  }

  // read information about the item database (an initial file is included for
  // faster startup rather than fetching all 100k+ items from maximo directly)
  /**
  * read the item cache file
  */
  async getItemCache() {
    const wb = new Exceljs.Workbook();
    await wb.xlsx.readFile(this.filePath);

    // read inventory data
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
      row[7] = ws3.getCell(`H${i}`).text;
      row[8] = ws3.getCell(`I${i}`).text;
      row[9] = ws3.getCell(`J${i}`).text;
      allInventory.push([...row, ws3.getCell(`H${i}`).text]);
      // add inventory data to ext_search_text
      if (row[2].length > 0 || row[3].length > 0 || row[4].length > 0 || row[5].length > 0 || row[6].length > 0) {
        if (inventoryData.has(row[0])) {
          for (let j = 1; j <= 7; j++) {
            if (row[j].length > 0 && row[j] != 'NULL') {
              inventoryData.get(row[0])[j] = inventoryData.get(row[0])[j] + '|' + row[j];
            }
          }
        } else {
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
          excelSerialToString(ws.getCell(`C${i}`).text),
          ws.getCell(`D${i}`).text,
          ws.getCell(`E${i}`).text,
          ws.getCell(`F${i}`).text,
          ws.getCell(`H${i}`).text,
          inventoryData.get(ws.getCell(`A${i}`).text),
        ]);
      } catch (error) {
        console.log(error);
        console.log(`row number: ${i}`);
      }
    }
    const ws2 = wb.getWorksheet('Sheet2');
    return [
      data,
      excelSerialToString(ws2.getCell('A2').text),
      allInventory,
    ];
    // to convert excel datetime in number format to string
  }

  // get inital list of manufacturers from the workbook
  async getManufactures() {
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet('Manufacturers');
    const lastrow = worksheet.lastRow.number;
    const data = [];
    for (let i = 2; i <= lastrow; i++) {
      if (worksheet.getCell(`A${i}`).text) {
        data.push([
          worksheet.getCell(`A${i}`).text,
          excelSerialToString(worksheet.getCell(`B${i}`).text),
          worksheet.getCell(`C${i}`).text,
          worksheet.getCell(`D${i}`).text,
        ]);
      }
    }
    return data;
  }

  // get initial list of abbreviations from the workbook
  async getAbbreviations() {
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet('Replacements');
    const lastrow = worksheet.lastRow.number;
    const data = [];
    for (let i = 3; i <= lastrow; i++) {
      if (worksheet.getCell(`D${i}`).text) {
        data.push([worksheet.getCell(`D${i}`).text, worksheet.getCell(`B${i}`).text]);
      }
    }
    return data;
  }

  // read item information from workbook being processed
  async getDescriptions(params) {
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    fs.copyFileSync(this.filePath, `${this.filePath}.backup`);
    report.info(`Backing up file as: "${this.filePath}.backup"`);
    const wsNames = workbook.worksheets.map(function(ele) {
      return ele.name;
    });
    if (!wsNames.includes(params.wsName)) {
      report.info('Workbook has the following worksheets:');
      report.info(`${wsNames}`);
      report.error(
        `"${params.wsName} does not exist, Please check spelling & captitalization"`,
      );
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
  }

  // write validated item information to the workbook
  // not used
  async writeDescriptions(descriptions, savePath) {
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet('Validate');
    descriptions.forEach((description) => {
      worksheet.getCell(`E${description.row}`).value = description.result[3]; // maximo description
      worksheet.getCell(`F${description.row}`).value = description.result[0]; // main description
      worksheet.getCell(`G${description.row}`).value = description.result[1]; // ext1
      worksheet.getCell(`H${description.row}`).value = description.result[2]; // ext2
      worksheet.getCell(`I${description.row}`).value = description.messages; // msg
    });
    try {
      await workbook.xlsx.writeFile(savePath);
    } catch (error) {
      console.log(error);
      const suffix = Date.now();
      savePath = savePath.split(`.`);
      savePath = `${savePath[0]}${suffix}.${savePath[1]}`;
      await workbook.xlsx.writeFile(savePath);
    }
    return savePath;
  }

  async saveDescription(parmas) {
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet(parmas[0].wsName);
    worksheet.getCell(`${parmas[0].outItemDesc[0]}${parmas[0].outRow}`).value = parmas[1][0]; // description1
    worksheet.getCell(`${parmas[0].outItemDesc[1]}${parmas[0].outRow}`).value = parmas[1][1]; // description2
    worksheet.getCell(`${parmas[0].outItemDesc[2]}${parmas[0].outRow}`).value = parmas[1][2]; // manufacturer
    worksheet.getCell(`${parmas[0].outUOM}${parmas[0].outRow}`).value = parmas[0].uom; // uom
    worksheet.getCell(`${parmas[0].outComm}${parmas[0].outRow}`).value = parmas[0].commGroup; // c-group
    worksheet.getCell(`${parmas[0].outGL}${parmas[0].outRow}`).value = parmas[0].glClass; // gl-class
    worksheet.getCell(`${parmas[0].outTranslate}${parmas[0].outRow}`).value =
            'placeholder-translated'; // translated
    worksheet.getCell(`${parmas[0].outMissing}${parmas[0].outRow}`).value =
            'placeholder-missing'; // missing
    await this.saveWorkbook(workbook, this.filePath);
  }

  async saveNumber(parmas) {
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet(parmas[1]);
    worksheet.getCell(`${parmas[3]}${parmas[2]}`).value = parmas[4];
    return await this.saveWorkbook(workbook, this.filePath);
  }

  async saveNonInteractive(parmas, data) {
    // convert to batch mode, individually it is too slow
    const workbook = new Exceljs.Workbook();
    await workbook.xlsx.readFile(this.filePath);
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

    return await this.saveWorkbook(workbook, this.filePath);
  }

  async saveWorkbook(workbook, savePath) {
    try {
      await workbook.xlsx.writeFile(savePath);
    } catch (error) {
      console.log(error);
      report.error(`Cannot edit old file make sure it is closed`);
    }
    return savePath;
  }

  async getColumnByName(name) {
    const wb = new Exceljs.Workbook();
    await wb.xlsx.readFile(this.filePath);
    const ws = wb.getWorksheet('Sheet1');

    let match;
    ws.eachRow((row) => row.eachCell((cell) => {
      if (cell.names.find((n) => n === name)) {
        match = cell;
      }
    }));
    return match;
  }

  async getTranslations() {
    // read all translation definitions from a workbook for import
    const wb = new Exceljs.Workbook();
    await wb.xlsx.readFile(this.filePath);
    const ws = wb.worksheets[0]; //assume there is only 1 worksheet and its the one we want
    const lastRow = ws.lastRow.number;
    const languages = ws.getRow(1).cellCount;
    let lang_codes = [];
    for (let i = 2; i <= languages; i++) {
      lang_codes.push(ws.getCell(1, i).text.toUpperCase());
    }
    let translations = [];
    for (let i = 2; i <= lastRow; i++) {
      for (let j = 2; j <= languages; j++) {
        translations.push({
          english: ws.getCell(i, 1).text.toUpperCase().trim(),
          lang_code: lang_codes[j - 2],
          translation: ws.getCell(i, j).text.toUpperCase().trim()
        });
      }
    }
    return translations;
  }

  async saveTranslations(data) {
    // save translated descriptions to excel file
    // multiple worksheets one for each language, and one for missing words
    const wb = new Exceljs.Workbook();
    let ws;
    let row;
    let rowCount;
    for (const lang of data.langs) {
      rowCount = 2;
      ws = wb.addWorksheet(lang);
      row = ws.getRow(1);
      row.values = ['Maximo Item Number', 'English Description', `${lang} Description`, 'Manufacturer Name'];
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
    report.result('done');
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
    report.result('done');
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
    if (arraysEqual(row, ['jpnum', 'jptask', 'description', 'orgid', 'siteid', 'metername', 'ldtext'])) {
      console.log('pass');
    } else {
      report.error(`Please Check Column Heading for JobTask Input expecting ${['jpnum', 'jptask', 'description', 'orgid', 'siteid', 'metername', 'ldtext']}`);
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
      });
    }
    return jobTasks;
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
          report.error(`Duplicate Meter: ${meter} on Row: ${rowNumber}`);
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
          });
          temp1 = removeRichText(row.values[6]);
          temp2 = removeRichText(row.values[7]);
          temp3 = removeRichText(row.values[8]);
          observation = {
            meter: meter,
            id_value: temp1,
            observation: temp2,
            action: temp3,
            search_str: `${meter}~${temp1}`
          };
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
        };
        observations.push(observation);
      }
    });
    report.result([meters.slice(1), observations.slice(1)]);
  }
}

function removeRichText(value) {
  // when reading cells from a row object there is no option for removing richtext
  if (typeof (value) === "string") {
    return value;
  } else if (typeof (value) == "object") {
    let temp = "";
    for (const part of value.richText) temp = `${temp}${part.text}`;
    return temp;
  } else if (typeof (value) == "undefined") {
    return undefined;
  } else {
    report.error(`Unknown cell type: ${typeof (value)}`);
  }
}

/**
 * Compare two arrays for deep equality
 * @param {Array} a
 * @param {Array} b
 * @returns {boolean} true if arrays are deep-equal, else false
 */
function arraysEqual(a, b) {
  if (!a || !b) {
    return false;
  }
  if (a.length != b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i]) && Array.isArray(b[i])) {
      if (!arraysEqual(a[i], b[i])) {
        return false;
      }
    } else if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

module.exports = Spreadsheet;
module.exports.excelSerialToString = excelSerialToString;
