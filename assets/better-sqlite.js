const { SqliteError } = require('better-sqlite3');
const sql = require('better-sqlite3')

class ObservationDatabase {
    constructor() {
        // TODO remove old db
        this.db = new sql('./assets/obserlist.db', {verbose: console.log });
        postMessage('better-SqliteError.js constructor');
    }

    createTables() {
        const createMeterTable = this.db.prepare(`CREATE TABLE meters(
            meter_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            list_id TEXT NOT NULL UNIQUE,
            inspect TEXT NOT NULL,
            desc TEXT NOT NULL,
            ext_desc TEXT NOT NULL,
            in_maximo INT DEFAULT 0,
            search_str TEXT);`);
        const createObservationTable = this.db.prepare(`CREATE TABLE observations(
            observation_id INTEGER PRIMARY KEY,
            meter TEXT NOT NULL,
            id_value TEXT NOT NULL,
            observation TEXT NOT NULL,
            action TEXT,
            in_maximo INT DEFAULT 0,
            search_str TEXT
            )`);
        const runQuery = this.db.transaction(() => {
            createMeterTable.run();
            createObservationTable.run();
        })
        runQuery();
    }

    close () {
        this.db.close()
    }

    insertMeter(data) {
        const insert = this.db.prepare(`INSERT INTO meters (
            name, list_id, inspect, desc, ext_desc, search_str)
            VALUES (@name, @list_id, @inspect, @desc, @ext_desc, @search_str)`);

        const insertMany = this.db.transaction((data) => {
            for (const meter of data) insert.run(meter);
        })

        insertMany(data);
    }

    insertObservation(data) {
        const insert = this.db.prepare(`INSERT INTO observations (
            meter, id_value, observation, action, search_str)
            VALUES (@meter, @id_value, @observation, @action, @search_str)`);

        const insertMany = this.db.transaction((data) => {
            for (const meter of data) insert.run(meter);
        })

        insertMany(data);
    }

    compareDomainDefinition(list_id, inspect, maximo_table) {
        // true means change will be taken care of when querying for in_maximo=0
        // maximo_table: meters are kept in two places, meters + alndomain, since they are the same the same function can be used, just make sure to make it as such
        let stmt = this.db.prepare('SELECT list_id, inspect FROM meters WHERE list_id = ?');
        const meter = stmt.all(list_id);
        if (meter.length === 1) {
            if (meter[0].inspect == inspect) {
                stmt = this.db.prepare(`UPDATE meters SET in_maximo = ${maximo_table} WHERE list_id = ?`)
                stmt.run(list_id)
                return true
            } else {
                postMessage(['debug', `Update Meter: "${list_id}" changed New: "${meter[0].inspect}" Old: "${inspect}"`]);
                return true
            }
        } else {
            postMessage(['debug', `Old Meter: ${list_id}: ${inspect} will be removed`]);
            return false
        }
    }


    compareDomainValues(search, observation) {
        let stmt = this.db.prepare('SELECT meter, id_value, observation FROM observations WHERE search_str = ?');
        const observ = stmt.all(search);
        if (observ.length === 1) {
            if (observ[0].observation == observation) {
                stmt = this.db.prepare('UPDATE observations SET in_maximo = 1 WHERE search_str = ?');
                stmt.run(search)
                return true
            } else {
                postMessage(['debug', `Update Observation: "${search}" changed New: "${observ[0].observation}" Old: "${observation}"`]);
                return true
            }
        } else {
            postMessage(['debug', `Old Observation: ${search}: ${observation} will be removed`]);
            return false
        }
    }

    getNewDomainDefinitions() {
        const stmt = this.db.prepare('SELECT list_id, inspect FROM meters WHERE in_maximo = 0');
        const meters = stmt.all();
        return meters
    }

    getNewMaximoMeters() {
        const stmt = this.db.prepare('SELECT list_id, inspect FROM meters WHERE in_maximo = 0 or in_maximo = 1');
        const meters = stmt.all();
        return meters
    }

    getNewDomainValues() {
        const stmt = this.db.prepare('SELECT meter, id_value, observation FROM observations WHERE in_maximo = 0');
        const observs = stmt.all();
        return observs
    }
    


}

module.exports = ObservationDatabase