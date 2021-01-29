const Dexie = require('dexie');
const ExcelReader = require('./spreadsheet');
const path = require('path');

class Database {
    constructor() {
        this.db = new Dexie('Phrases');
        this.db.version(1).stores({
            manufacturers: "++id, full_name, short_name",
            abbreviations: "++id, orig_text, replace_text"
        });
        this.db.open();
        this.checkValidDB().then(
            (result) => {
                if (result) {
                    console.log('db ready');
                } else {
                    const { app } = require('electron').remote;
                    let appPath = app.getAppPath();
                    appPath = path.join(appPath, 'assets', 'item_database.xlsm')
                    const excel = new ExcelReader(appPath);
                    let manu = excel.getManufactures();
                    let abbr = excel.getAbbreviations();
                    this.populateAbbr(abbr);
                    this.populateManu(manu);
                    console.log('db ready');
                }
            } 
            );
    }

    async checkValidDB() {
        let result = await Promise.all([
            this.db.manufacturers.count(),
            this.db.abbreviations.count()
        ]);
        console.log(`manu: ${result[0]}, abbr: ${result[0]}`)
        if (result[0] > 0 && result[1] > 0) {
            return true;
        } else {
            return false;
        }
    }

    async populateAbbr(data){
        let dataDB = [];
        for (let i=0;i<data.length;i++) {
            dataDB.push({orig_text: data[i][0], replace_text: data[i][1]});
        }
        this.db.abbreviations.bulkAdd(dataDB)
    }

    async populateManu(data) {
        let dataDB = [];
        for (let i=0;i<data.length;i++) {
            dataDB.push({full_name: data[i][0], short_name: data[i][1], website: data[i][2]});
        }
        this.db.manufacturers.bulkAdd(dataDB)
    }

    isManufacturer(name) {
        // let result = await this.db.manufacturers
        //     .where(['full_name'])
        //     .equalsIgnoreCase(name).first().then((manu) => {
        //         return manu.short_name
        //     })
        
        // let result2 = await this.db.manufacturers
        //     .where(['short_name'])
        //     .equalsIgnoreCase(name)
        return {short_name: name}
    }

    isAbbreviation(phase) {
        return {short_text: phase}
    }

}

module.exports = Database