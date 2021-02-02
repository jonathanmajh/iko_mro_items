const Dexie = require('dexie');
const ExcelReader = require('./spreadsheet');
const { ipcRenderer } = require('electron');
// const { app } = require('electron').remote;

class Database {
    constructor() {
        this.db = new Dexie('Phrases');
        this.db.version(1).stores({
            manufacturers: "++id, full_name, short_name",
            abbreviations: "++id, orig_text, replace_text"
        });
        this.checkValidDB().then(
            (result) => {
                if (result) {
                    console.log('db ready');
                } else {
                    const appPath = ipcRenderer.sendSync('getPath')
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

    async isManufacturer(name) {
        let result = await this.db.manufacturers.where('full_name').startsWithIgnoreCase(name).toArray()
        if (result.length==0) {
            result = await this.db.manufacturers.where('short_name').startsWithIgnoreCase(name).toArray()
        }
        return {short_name: name, obj: result}
    }

    isAbbreviation(phase) {
        return {short_text: phase}
    }

}

module.exports = Database