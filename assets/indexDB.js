const Dexie = require('dexie');
const ExcelReader = require('./spreadsheet');
const path = require('path');
const utils = require('../assets/utils')

// Deprecated, will be converted to better-sqlite library

class Database {
    constructor() {
        // database definitions, required on object initiation
        this.db = new Dexie('Phrases');
        this.db.version(5).stores({
            manufacturers: "++id, full_name, short_name",
            abbreviations: "++id, orig_text, replace_text",
            workingDescription: "row, description",
            itemCache: "itemnum, description, changed_date, *search",
            versions: "item, version",
        });
    }

    // saves item descirption from maximo into the db
    async saveItemCache(data) {
        let dataDB = [];
        let search = '';
        for (let i = 0; i < data.length; i++) {
            search = data[i][1].toUpperCase().replaceAll(' ', ',').split(",");
            search = search.filter(item => item.length !== 0)
            dataDB.push({ itemnum: String(data[i][0]), description: data[i][1], changed_date: data[i][2], search: search });
        }
        await this.db.itemCache.bulkPut(dataDB);
    }

    // get the time stamp (version) of when the item cache was last updated
    async getVersion(item) {
        return await this.db.versions.where('item').equals(item).toArray();
    }

    //update the time stamp of the item cache
    async saveVersion(item, newVersion) {
        return await this.db.versions.put({ item: item, version: newVersion });
    }

    // check if the database is populated from a previous run of the program
    async checkValidDB() {
        let result = await Promise.all([
            this.db.manufacturers.count(),
            this.db.abbreviations.count()
        ]);
        console.log(`manu: ${result[0]}, abbr: ${result[0]}`)
        if (result[0] > 0 && result[1] > 0) {
            console.log('db ready');
        } else {
            const filePath = path.join(require('path').resolve(__dirname), 'item_database.xlsx');
            const excel = new ExcelReader(filePath);
            let manu = excel.getManufactures();
            let abbr = excel.getAbbreviations();
            this.populateAbbr(abbr);
            this.populateManu(manu);
            console.log('db ready');
        }
    }

    //populate the database with abbrivations
    async populateAbbr(data) {
        let dataDB = [];
        for (let i = 0; i < data.length; i++) {
            dataDB.push({ orig_text: data[i][0], replace_text: data[i][1] });
        }
        await this.db.abbreviations.bulkAdd(dataDB);
    }

    // populate the database with manufacturers
    async populateManu(data) {
        let dataDB = [];
        for (let i = 0; i < data.length; i++) {
            dataDB.push({ full_name: data[i][0], short_name: data[i][1], website: data[i][2] });
        }
        await this.db.manufacturers.bulkAdd(dataDB);
    }

    // checks if the name given is a manufacturer
    async isManufacturer(name) {
        let result = await this.db.manufacturers.where('full_name').equalsIgnoreCase(name).toArray();
        if (result.length == 0) {
            result = await this.db.manufacturers.where('short_name').equalsIgnoreCase(name).toArray();
        }
        return result[0];
    }

    // check if the phrase given has a known abbrivation
    async isAbbreviation(phase) {
        let result = await this.db.abbreviations.where('orig_text').equalsIgnoreCase(phase).toArray();
        return result[0];
    }

    // saves the current set of descriptions being worked on into the database
    async saveDescription(data) {
        let dataDB = [];
        for (const [rowid, desc] of Object.entries(data)) {
            dataDB.push({ row: desc[0], description: desc[1] });
        }
        console.log('starting to clear')
        await this.db.workingDescription.clear().then(function () {
            console.log('finished clearing')
        }).catch(function (err) {
            console.log(err.stack);
            console.log(err)
        });
        await this.db.workingDescription.bulkAdd(dataDB).catch(function (err) {
            console.log(err.stack);
            console.log(err)
        });
        console.log('finished adding');
        return true
    }

    async getDescription(row) {
        let result = await this.db.workingDescription.where('row').equals(row).toArray();
        return result[0]
    }
}

module.exports = Database