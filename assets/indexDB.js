const sql = require('better-sqlite3');
const { SqliteError } = require('better-sqlite3');
const ExcelReader = require('./spreadsheet');
const path = require('path');
const utils = require('../assets/utils')
const intersection = require('lodash.intersection');
//https://lodash.com/docs/4.17.15#intersection
// fast library for intersection of arrays


class Database {
    constructor() {
        this.db = new sql(`${process.env.APPDATA}/iko_utility/itemRelated.db`);//, { verbose: console.log });
    }

    createTables() {
        const dropTables = this.db.prepare('DROP TABLE IF EXISTS manufacturers');
        const dropTables2 = this.db.prepare('DROP TABLE IF EXISTS abbreviations');
        const dropTables3 = this.db.prepare('DROP TABLE IF EXISTS workingDescription')
        const dropTables4 = this.db.prepare('DROP TABLE IF EXISTS itemCache')
        const runQuery2 = this.db.transaction(() => {
            dropTables.run();
            dropTables2.run();
            dropTables3.run();
            dropTables4.run();
        })
        runQuery2();
        const createTable1 = this.db.prepare(`CREATE TABLE manufacturers(
            id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL,
            short_name TEXT NOT NULL
            );`);
        const createTable2 = this.db.prepare(`CREATE TABLE abbreviations(
            id INTEGER PRIMARY KEY,
            orig_text TEXT NOT NULL,
            replace_text TEXT NOT NULL
            )`);
        const createTable3 = this.db.prepare(`CREATE TABLE workingDescription (
            row INTEGER NOT NULL,
            description TEXT NOT NULL,
            orgid TEXT
        )`);
        const createTable4 = this.db.prepare(`CREATE TABLE itemCache (
            itemnum TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            changed_date TEXT,
            search_text TEXT,
            gl_class TEXT,
            uom TEXT,
            commodity_group TEXT
        )`)
        const runQuery = this.db.transaction(() => {
            createTable1.run();
            createTable2.run();
            createTable3.run();
            createTable4.run();
        })
        runQuery();
        console.log('refreshed tables')
    }

    // saves item descirption from maximo into the db
    clearItemCache() {
        let stmt = this.db.prepare(`DELETE FROM itemCache`)
        stmt.run()
    }

    saveItemCache(data) {

        let dataDB = [];
        let search = '';
        for (let i = 0; i < data.length; i++) {
            if (data[i][1]) { //test if description is blank
                search = data[i][1].toUpperCase()
                for (const char of utils.STRINGCLEANUP) {
                    search = search.replaceAll(char, '');
                }
                dataDB.push({
                    itemnum: data[i][0],
                    description: data[i][1],
                    changed_date: data[i][2],
                    gl_class: data[i][3],
                    uom: data[i][4],
                    commodity_group: data[i][5],
                    search_text: search
                });
            } else {
                search = "undefined"
            }
        }
        const insert = this.db.prepare(`INSERT OR REPLACE INTO itemCache (
            itemnum, description, changed_date, search_text, gl_class, uom, commodity_group)
            VALUES (@itemnum, @description, @changed_date, @search_text, @gl_class, @uom, @commodity_group)`);
        const insertMany = this.db.transaction((dataDB) => {
            for (const item of dataDB) insert.run(item);
        })
        insertMany(dataDB);
    }

    // get the time stamp (version) of when the item cache was last updated
    getVersion() {
        const stmt = this.db.prepare('SELECT changed_date FROM itemCache ORDER BY changed_date DESC LIMIT 1');
        const version = stmt.all();
        return version;
    }

    // check if the database is populated from a previous run of the program
    async checkValidDB() {
        let stmt1;
        let stmt2;
        try {
            stmt1 = this.db.prepare('SELECT COUNT(*) as c FROM manufacturers');
            stmt2 = this.db.prepare('SELECT COUNT(*) as c FROM abbreviations');
        } catch (SqliteError) {
            this.createTables()
            stmt1 = this.db.prepare('SELECT COUNT(*) as c FROM manufacturers');
            stmt2 = this.db.prepare('SELECT COUNT(*) as c FROM abbreviations');
        }
        const result = [stmt1.get()['c'], stmt2.get()['c']];
        console.log(`manu: ${result[0]}, abbr: ${result[1]}`)
        if (result[0] > 0 && result[1] > 0) {
            console.log('db ready');
        } else {
            const filePath = path.join(require('path').resolve(__dirname), 'item_database.xlsx');
            const excel = new ExcelReader(filePath);
            let manu = await excel.getManufactures();
            let abbr = await excel.getAbbreviations();
            this.populateAbbr(abbr);
            this.populateManu(manu);
            console.log('db ready');
        }
    }

    //populate the database with abbrivations
    populateAbbr(data) {
        let dataDB = [];
        for (let i = 0; i < data.length; i++) {
            dataDB.push({ orig_text: data[i][0], replace_text: data[i][1] });
        }
        const insert = this.db.prepare(`INSERT INTO abbreviations (
            orig_text, replace_text)
            VALUES (@orig_text, @replace_text)`);
        const insertMany = this.db.transaction((data) => {
            for (const item of data) insert.run(item);
        })
        insertMany(dataDB);
    }

    // populate the database with manufacturers
    populateManu(data) {
        let dataDB = [];
        for (let i = 0; i < data.length; i++) {
            dataDB.push({ full_name: data[i][0], short_name: data[i][1], website: data[i][2] });
        }
        const insert = this.db.prepare(`INSERT INTO manufacturers (
            full_name, short_name)
            VALUES (@full_name, @short_name)`);
        const insertMany = this.db.transaction((data) => {
            for (const item of data) insert.run(item);
        })
        insertMany(dataDB);
    }

    // checks if the name given is a manufacturer
    isManufacturer(name) {
        let stmt = this.db.prepare(`SELECT short_name FROM manufacturers where full_name = '${name}' or short_name = '${name}'`)
        return stmt.get();
    }

    // check if the phrase given has a known abbrivation
    isAbbreviation(phase) {
        let result = this.db.prepare(`SELECT replace_text from abbreviations where orig_text = '${phase}'`)
        return result.get();
    }

    // saves the current set of descriptions being worked on into the database
    saveDescription(data) {
        let dataDB = [];
        for (const [, desc] of Object.entries(data)) {
            dataDB.push({ row: desc[0], description: desc[1] });
        }
        console.log('starting to clear')
        let stmt = this.db.prepare(`DELETE FROM workingDescription`)
        stmt.run()
        stmt = this.db.prepare(`INSERT INTO abbreviations (
            row, description, orgid)
            VALUES (@row, @description, @orgid)`)
        let insertMany = this.db.transaction((dataDB) => {
            for (const item of dataDB) stmt.run(item);
        })
        insertMany(dataDB);
        console.log('finished adding');
        return true
    }

    getDescription(row) {
        let result = this.db.prepare(`SELECT * from workingDescription where row = '${row}'`)
        return result.get();
    }


    findRelated(data) {
        let itemDict = {}
        for (const char of utils.STRINGCLEANUP) {
            data = data.replaceAll(char, ',');
        }
        const phrases = data.split(',');
        let result = []
        postMessage(['progress', 25, "Getting Item Descriptions From Maximo"])
        for (let i = 0; i < phrases.length; i++) {
            if (phrases[i].length > 0) {
                result.push(this.fetchAndObjectify(phrases[i], itemDict))
                postMessage(['progress', 75, "Processing Item Descriptions From Maximo"]) //change this to per phrase
            }
        }
        result = result.filter(item => item !== false);
        if (result.length) {
            let arrayAsNum = [...Array(result.length).keys()] //create an array with only integers to find combinations
            arrayAsNum = getCombinations(arrayAsNum);
            let intersections = []
            for (let i = arrayAsNum.length; i > 0; i--) { //convert combination of integers to combination of arrays
                let holder = [];
                arrayAsNum[i - 1].forEach(index => {
                    holder.push(result[index]);
                });
                intersections.push([holder.length, intersection(...holder)])
            }
            postMessage(['result', matchAndScore(intersections), itemDict, data]);
        } else {
            postMessage(['warning', 'No related items returned from Maximo']);
            postMessage(['result', false]);
        }
    }

    fetchAndObjectify(phrase, itemDict) {
        phrase = phrase.toUpperCase()
        postMessage(['debug', `Getting item from cache: "${phrase}"`]);
        let stmt = this.db.prepare(`SELECT * from itemCache where search_text like '%${phrase}%'`);
        let result = stmt.all()
        let itemNums = [];
        result.forEach(item => {
            itemNums.push(item.itemnum);
            itemDict[item.itemnum] = [item.description, item.gl_class, item.uom, item.commodity_group];
        });
        return itemNums;
    }
}

module.exports = Database

function matchAndScore(data) {
    postMessage(['progress', 80, "Processing Item Descriptions"])
    const numPhases = data[0][0];
    let matchedScores = {};
    let saved = {};
    data.forEach(item => {
        let score = item[0] / numPhases;
        if (!(score in matchedScores)) {
            matchedScores[score] = [];
        }
        item[1].forEach(itemNum => {
            if (!(itemNum in saved)) {
                matchedScores[score].push(itemNum);
                saved[itemNum] = 1;
            }
        });
    });
    return matchedScores;
}

//https://stackoverflow.com/a/59942031
//Generate all possible non duplicate combinations of the arrays
function getCombinations(valuesArray) {

    var combi = [];
    var temp = [];
    var slent = Math.pow(2, valuesArray.length);

    for (var i = 0; i < slent; i++) {
        temp = [];
        for (var j = 0; j < valuesArray.length; j++) {
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

