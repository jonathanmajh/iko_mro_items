const { SqliteError } = require('better-sqlite3');
const sql = require('better-sqlite3')

class ObservationDatabase {
    constructor() {
        // TODO remove old db
        this.db = new sql('./assets/obserlist.db', {verbose: console.log });
        postMessage('better-SqliteError.js constructor');
        const createMeterTable = this.db.prepare(`CREATE TABLE meters(
            name text NOT NULL UNIQUE,
            list_id text NOT NULL UNIQUE,
            inspect text NOT NULL,
            desc text NOT NULL,
            ext_desc text NOT NULL
            );`);
        const createObservationTable = this.db.prepare(`CREATE TABLE observations(
            meter text NOT NULL,
            id text NOT NULL,
            observation text NOT NULL,
            action text
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
            name, list_id, inspect, desc, ext_desc)
            VALUES (@name, @list_id, @inspect, @desc, @ext_desc)`);

        const insertMany = this.db.transaction((data) => {
            for (const meter of data) insert.run(meter);
        })

        insertMany(data);
    }

    insertObservation(data) {
        const insert = this.db.prepare(`INSERT INTO observations (
            meter, id, observation, action)
            VALUES (@meter, @id, @observation, @action)`);

        const insertMany = this.db.transaction((data) => {
            for (const meter of data) insert.run(meter);
        })

        insertMany(data);
    }


}