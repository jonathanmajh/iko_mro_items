const Sql = require('better-sqlite3');
const utils = require('../assets/utils');
const intersection = require('lodash/intersection');
// https://lodash.com/docs/4.17.15#intersection
// fast library for intersection of arrays

/**
 * Database Class containing more Database functions
 */
class Database {
  /**
 * Open default db file
 */
  constructor() {
    this.db = new Sql(`${process.env.APPDATA}/EAM Spare Parts/program.db`);// , { verbose: console.log });
  }

  createTables() {
    const dropTables = this.db.prepare('DROP TABLE IF EXISTS manufacturers');
    const dropTables2 = this.db.prepare('DROP TABLE IF EXISTS abbreviations');
    const dropTables3 = this.db.prepare('DROP TABLE IF EXISTS workingDescription');
    const dropTables4 = this.db.prepare('DROP TABLE IF EXISTS itemCache');
    const dropTables5 = this.db.prepare('DROP TABLE IF EXISTS itemDescAnalysis');
    const dropTables6 = this.db.prepare('DROP TABLE IF EXISTS inventoryCache');
    const runQuery2 = this.db.transaction(() => {
      dropTables.run();
      dropTables2.run();
      dropTables3.run();
      dropTables4.run();
      dropTables5.run();
      dropTables6.run();
    });
    runQuery2();
    const createTable1 = this.db.prepare(`CREATE TABLE manufacturers(
            id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL COLLATE NOCASE,
            short_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            homepage TEXT,
            changed_date TEXT COLLATE NOCASE
            );`);
    const createTable2 = this.db.prepare(`CREATE TABLE abbreviations(
            id INTEGER PRIMARY KEY,
            orig_text TEXT NOT NULL COLLATE NOCASE,
            replace_text TEXT NOT NULL COLLATE NOCASE
            )`);
    const createTable3 = this.db.prepare(`CREATE TABLE workingDescription (
            row INTEGER NOT NULL,
            description TEXT NOT NULL COLLATE NOCASE,
            analysis TEXT,
            related TEXT,
            translate TEXT,
            orgid TEXT COLLATE NOCASE
        )`);
    const createTable4 = this.db.prepare(`CREATE TABLE itemCache (
            itemnum TEXT PRIMARY KEY,
            description TEXT NOT NULL COLLATE NOCASE,
            details TEXT COLLATE NOCASE,
            changed_date TEXT COLLATE NOCASE,
            search_text TEXT COLLATE NOCASE,
            gl_class TEXT COLLATE NOCASE,
            uom TEXT COLLATE NOCASE,
            commodity_group TEXT COLLATE NOCASE,
            ext_search_text TEXT COLLATE NOCASE,
            ext_description TEXT COLLATE NOCASE
        )`);
    const createTable5 = this.db.prepare(`CREATE TABLE itemDescAnalysis (
            tree TEXT PRIMARY KEY COLLATE NOCASE,
            descriptor TEXT NOT NULL COLLATE NOCASE,
            parent TEXT,
            count INTEGER,
            level INTEGER
        )`);
    const createTable6 = this.db.prepare(`CREATE TABLE inventoryCache (
            itemnum TEXT NOT NULL COLLATE NOCASE,
            siteid TEXT NOT NULL COLLATE NOCASE,
            catalogcode TEXT COLLATE NOCASE,
            modelnum TEXT COLLATE NOCASE,
            vendor TEXT COLLATE NOCASE,
            manufacturer TEXT COLLATE NOCASE,
            companyname TEXT COLLATE NOCASE,
            rowstamp TEXT,
            location TEXT NOT NULL COLLATE NOCASE,
            PRIMARY KEY (itemnum, location)
        )`);
    const runQuery = this.db.transaction(() => {
      createTable1.run();
      createTable2.run();
      createTable3.run();
      createTable4.run();
      createTable5.run();
      createTable6.run();
    });
    runQuery();
    console.log('refreshed tables');
  }

  clearItemCache() {
    const stmt = this.db.prepare(`DELETE FROM itemCache`);
    stmt.run();
  }

  saveInventoryCache(data) {
    const dataDB = [];
    for (let i = 0; i < data.length; i++) {
      dataDB.push({
        itemnum: data[i][0],
        siteid: data[i][1],
        catalogcode: data[i][2],
        modelnum: data[i][3],
        vendor: data[i][4],
        manufacturer: data[i][5],
        companyname: data[i][6],
        rowstamp: data[i][8],
        location: data[i][7],
      });
    }
    const insert = this.db.prepare(
      `insert or replace into inventoryCache (
                itemnum, siteid, catalogcode, modelnum, vendor, manufacturer, companyname, rowstamp, location)
                VALUES (@itemnum, @siteid, @catalogcode, @modelnum, @vendor, @manufacturer, @companyname, @rowstamp, @location)`,
    );
    const insertMany = this.db.transaction((dataDB) => {
      for (const item of dataDB) insert.run(item);
    });
    insertMany(dataDB);
  }


  /**
 * For Updated items obtained from Maximo.
 * Update the extended search information
 * @param {list} itemNums Data returned from Maximo
 * @return {list} processed data
 */
  processNewItems(itemNums) {
    let stmt;
    const updatedData = [];
    const inventoryData = new Map();
    for (const [key, value] of itemNums) {
      stmt = this.db.prepare(`SELECT * FROM itemCache WHERE itemnum = '${value}'`);
      const itemDetails = stmt.get();
      stmt = this.db.prepare(`SELECT * FROM inventoryCache WHERE itemnum = '${key}'`);
      const results = stmt.all();
      results.forEach((inventory) => {
        const row = [];
        row[0] = inventory.itemnum;
        row[1] = inventory.siteid;
        row[2] = inventory.catalogcode;
        row[3] = inventory.modelnum;
        row[4] = inventory.vendor;
        row[5] = inventory.manufacturer;
        row[6] = inventory.companyname;
        row[7] = inventory.location;
        if (inventoryData.has(inventory.itemnum)) {
          for (let j = 1; j <= 7; j++) {
            if (row[j] != '') {
              inventoryData.get(inventory.itemnum)[j] = inventoryData.get(inventory.itemnum)[j] + '|' + row[j];
            }
          }
        } else {
          inventoryData.set(inventory.itemnum, row);
        }
      });
      updatedData.push([
        itemDetails.itemnum,
        itemDetails.description,
        itemDetails.changed_date,
        itemDetails.gl_class,
        itemDetails.uom,
        itemDetails.commodity_group,
        itemDetails.details,
        inventoryData.get(key),
      ]);
    }
    return updatedData;
  }

  /**
 * save items into db
 * @param {list} data from source
 */
  saveItemCache(data) {
    const dataDB = [];
    let search = '';
    let extSearch = '';
    let extDesc = '';
    for (let i = 0; i < data.length; i++) {
      if (data[i][1]) { // test if description is blank
        search = data[i][1].toUpperCase();
        for (const char of utils.STRINGCLEANUP) {
          search = search.replaceAll(char, '');
        }
        extSearch = search;
        extDesc = '';

        // add inventory data
        if (data[i][7]) {
          for (let j = 0; j < data[i][7].length; j++) {
            if (data[i][7][j].length > 0) {
              extSearch = `${extSearch}|${data[i][7][j]}`;
            }
          }
          for (let j = 2; j < data[i][7].length; j++) {
            if (data[i][7][j].length > 0) {
              extDesc = `${extDesc}${data[i][7][j].replaceAll('|', ' ')} `;
            }
          }
        }

        // add item master details
        if (data[i][6]) {
          extSearch = `${extSearch}|${data[i][6]}`;
          extDesc = `${extDesc}${data[i][6]}`;
          for (const char of utils.STRINGCLEANUP) {
            extSearch = extSearch.replaceAll(char, '');
          }
        }
        dataDB.push({
          itemnum: data[i][0],
          description: data[i][1],
          changed_date: data[i][2],
          gl_class: data[i][3],
          uom: data[i][4],
          commodity_group: data[i][5],
          details: data[i][6],
          search_text: search,
          ext_search_text: extSearch,
          ext_desc: extDesc,
        });
      }
    }
    const insert = this.db.prepare(`INSERT OR REPLACE INTO itemCache (
            itemnum, description, details, changed_date, search_text, gl_class, uom, commodity_group, ext_search_text, ext_description)
            VALUES (@itemnum, @description, @details, @changed_date, @search_text, @gl_class, @uom, @commodity_group, @ext_search_text, @ext_desc)`);
    const insertMany = this.db.transaction((dataDB) => {
      for (const item of dataDB) insert.run(item);
    });
    insertMany(dataDB);

    const manufs = this.getAllManufacturers();
    const analysis = itemOccurrence(data, manufs);
    const stmt = this.db.prepare(`INSERT INTO itemDescAnalysis (tree, descriptor, parent, count, level)
            VALUES (@tree, @descriptor, @parent, @count, @level)
            ON CONFLICT(tree)
            DO UPDATE SET count = count + @count`);
    const insertMany2 = this.db.transaction((analysis) => {
      for (const [key, item] of analysis) {
        stmt.run({ tree: key, descriptor: item.phrase, parent: item.parent, count: item.count, level: item.level });
      }
    });
    insertMany2(analysis);
    console.log('finished adding analysis');
  }

  getAnalysis(tree) {
    const stmt = this.db.prepare('SELECT tree, descriptor, parent, count, level FROM itemDescAnalysis where tree = @tree');
    const result = stmt.get({ tree: tree });
    return result;
  }

  getAllWorkingDesc() {
    const stmt = this.db.prepare('SELECT *, itemCache.description FROM workingDescription left join itemCache on itemCache.itemnum = workingDescription.related WHERE analysis IS NOT NULL');
    const result = stmt.all();
    return result;
  }

  // get the time stamp (version) of when the item cache was last updated
  getVersion(type) {
    let stmt;
    if (type === 'maximo') {
      stmt = this.db.prepare('SELECT changed_date FROM itemCache ORDER BY changed_date DESC LIMIT 1');
    } else if (type === 'manufacturer') {
      stmt = this.db.prepare('SELECT changed_date FROM manufacturers ORDER BY changed_date DESC LIMIT 1');
    } else if (type === 'inventory') {
      stmt = this.db.prepare('SELECT rowstamp FROM inventoryCache ORDER BY rowstamp DESC LIMIT 1');
    }
    let version = stmt.all();
    if (version.length == 0) {
      version = [{ changed_date: '2022-01-01 00:00:00' }];
    }
    return version;
  }

  getAllManufacturers() {
    const stmt = this.db.prepare('SELECT short_name FROM manufacturers');
    return stmt.all();
  }

  // populate the database with abbrivations
  populateAbbr(data) {
    const dataDB = [];
    for (let i = 0; i < data.length; i++) {
      dataDB.push({ orig_text: data[i][0], replace_text: data[i][1] });
    }
    const insert = this.db.prepare(`INSERT INTO abbreviations (
            orig_text, replace_text)
            VALUES (@orig_text, @replace_text)`);
    const insertMany = this.db.transaction((data) => {
      for (const item of data) insert.run(item);
    });
    insertMany(dataDB);
  }

  // populate the database with manufacturers
  saveManufacturers(data) {
    const dataDB = [];
    for (let i = 0; i < data.length; i++) {
      dataDB.push({ full_name: data[i][2], short_name: data[i][0], homepage: data[i][3], changed_date: data[i][1] });
    }
    const insert = this.db.prepare(`INSERT OR REPLACE INTO manufacturers (
            full_name, short_name, homepage, changed_date)
            VALUES (@full_name, @short_name, @homepage, @changed_date)`);
    const insertMany = this.db.transaction((data) => {
      for (const item of data) insert.run(item);
    });
    insertMany(dataDB);
  }

  // checks if the name given is a manufacturer
  isManufacturer(name) {
    const stmt = this.db.prepare(`SELECT short_name FROM manufacturers where full_name = ? or short_name = ?`);
    return stmt.get([name, name]);
  }

  // check if the phrase given has a known abbrivation
  isAbbreviation(phase) {
    const result = this.db.prepare(`SELECT replace_text from abbreviations where orig_text = ?`);
    return result.get([phase]);
  }

  // saves the current set of descriptions being worked on into the database
  saveDescription(data) {
    const dataDB = [];
    for (const [, desc] of Object.entries(data)) {
      dataDB.push({ row: desc[0], description: desc[1] });
    }
    console.log('starting to clear');
    let stmt = this.db.prepare(`DELETE FROM workingDescription`);
    stmt.run();
    stmt = this.db.prepare(`INSERT INTO workingDescription (
            row, description)
            VALUES (@row, @description)`);
    let count = 0;
    const insertMany = this.db.transaction((dataDB) => {
      for (const item of dataDB) {
        if (item.description.length > 0) {
          stmt.run(item);
          count++;
        }
      }
    });
    insertMany(dataDB);
    console.log('finished adding');
    return count;
  }

  saveDescriptionAnalysis(data, row) {
    const stmt = this.db.prepare('UPDATE workingDescription SET analysis = ?, related = ? WHERE row = ?');
    stmt.run(JSON.stringify(data), data.related, row);
  }

  getDescription(row) {
    const result = this.db.prepare(`SELECT * FROM workingDescription WHERE row >= '${row}' ORDER BY row ASC LIMIT 1`);
    return result.get();
  }

  loadItem(itemnum) {
    let result = this.db.prepare(`SELECT itemnum, description, gl_class, uom, commodity_group from itemCache where itemnum = '${itemnum}'`);
    result = result.get();
    return result;
  }

  findRelated(data, ext = false, postmessage) {
    const itemDict = {};
    for (const char of utils.STRINGCLEANUP) {
      data = data.replaceAll(char, ',');
    }
    const phrases = data.split(',');
    let result = [];
    postMessage(['progress', 25, 'Getting Item Descriptions From Maximo']);
    for (let i = 0; i < phrases.length; i++) {
      if (phrases[i].length > 1) { // ignore single characters searches since they add too much time
        result.push(this.fetchAndObjectify(phrases[i], ext, itemDict));
        postMessage(['progress', 75, 'Processing Item Descriptions From Maximo']); // change this to per phrase
      }
    }
    result = result.filter((item) => item !== false);
    if (result.length) {
      let arrayAsNum = [...Array(result.length).keys()]; // create an array with only integers to find combinations
      arrayAsNum = getCombinations(arrayAsNum);
      const intersections = [];
      for (let i = arrayAsNum.length; i > 0; i--) { // convert combination of integers to combination of arrays
        const holder = [];
        arrayAsNum[i - 1].forEach((index) => {
          holder.push(result[index]);
        });
        intersections.push([holder.length, intersection(...holder)]);
      }
      if (postmessage) {
        postMessage(['result', matchAndScore(intersections), itemDict, data]);
      } else {
        return [matchAndScore(intersections), itemDict, data];
      }
    } else {
      postMessage(['warning', 'No related items returned from Maximo']);
      postMessage(['result', false]);
    }
  }

  fetchAndObjectify(phrase, ext, itemDict) {
    phrase = phrase.toUpperCase();
    postMessage(['debug', `Getting item from cache: "${phrase}"`]);
    let stmt;
    if (ext) {
      stmt = this.db.prepare(`SELECT *, (select group_concat(location) from inventoryCache where siteid = 'AA' and inventoryCache.itemnum = itemCache.itemnum) storeroom from itemCache where ext_search_text like ?`);
    } else {
      stmt = this.db.prepare(`SELECT *, (select group_concat(location) from inventoryCache where siteid = 'AA' and inventoryCache.itemnum = itemCache.itemnum) storeroom from itemCache where search_text like ?`);
    }

    const result = stmt.all(`%${phrase}%`);
    const itemNums = [];
    result.forEach((item) => {
      itemNums.push(item.itemnum);
      if (ext) {
        let desc = item.ext_search_text;
        const idx = desc.indexOf('|');// find the pipe symbol
        // if there is a pipe symbol, then there is additional info after it
        if (idx !== -1) {
          let itemInfo = desc.slice(idx + 12);// stuff after the pipe symbol
          itemInfo = itemInfo.replaceAll('NULL', '').replaceAll('|', ' ');

          desc = item.description + '|' + itemInfo;
        } else { // no pipe symbol, just use the description
          desc = item.description + '|';
        }

        itemDict[item.itemnum] = [desc, item.gl_class, item.uom, item.commodity_group, item.storeroom];
      } else {
        itemDict[item.itemnum] = [item.description, item.gl_class, item.uom, item.commodity_group, item.storeroom];
      }
    });
    return itemNums;
  }
}

module.exports = Database;

function matchAndScore(data) {
  postMessage(['progress', 80, 'Processing Item Descriptions']);
  const numPhases = data[0][0];
  const matchedScores = {};
  const saved = {};
  data.forEach((item) => {
    const score = item[0] / numPhases;
    if (!(score in matchedScores)) {
      matchedScores[score] = [];
    }
    item[1].forEach((itemNum) => {
      if (!(itemNum in saved)) {
        matchedScores[score].push(itemNum);
        saved[itemNum] = 1;
      }
    });
  });
  return matchedScores;
}

// https://stackoverflow.com/a/59942031
// Generate all possible non duplicate combinations of the arrays
function getCombinations(valuesArray) {
  const combi = [];
  let temp = [];
  const slent = Math.pow(2, valuesArray.length);

  for (let i = 0; i < slent; i++) {
    temp = [];
    for (let j = 0; j < valuesArray.length; j++) {
      if ((i & Math.pow(2, j))) {
        temp.push(valuesArray[j]);
      }
    }
    if (temp.length > 0) {
      combi.push(temp);
    }
  }

  combi.sort((a, b) => a.length - b.length);
  return combi;
}

function itemOccurrence(data, manufs) {
  const dataProcessed = new Map();
  let description;
  let level = 0;
  let tree = '';
  let parent = '';
  const regex = /\d+/g;
  for (let i = 0; i < data.length; i++) {
    level = 0;
    tree = '';
    parent = '';
    if (data[i][1]) { // test if description is blank
      description = data[i][1].split(',');
      for (let j = 0; j < description.length; j++) {
        if (!(description[j].match(regex)) && !(manufs.includes(description[j]))) {
          level++;
          if (tree.length > 0) {
            tree = tree + ',' + description[j];
          } else {
            tree = description[j];
          }
          if (dataProcessed.has(tree)) {
            dataProcessed.get(tree).count++;
          } else {
            dataProcessed.set(tree, {
              phrase: description[j],
              parent: parent,
              count: 1,
              level: level,
            });
          }
          parent = description[j];
        }
      }
    }
  }
  return dataProcessed;
}
