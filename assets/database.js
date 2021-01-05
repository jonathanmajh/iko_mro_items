const sqlite3 = require('better-sqlite3')


class Database {
    constructor() {
        this.db = new sqlite3('./assets/db.db', { verbose: console.log });
        console.log('Database ready');
        postMessage('database.js says hi boss')
        // since this task is started from a worker, postMessage is global :D
    }

    close() {
        this.db.close();
        console.log('Close the database connection.');

    }

    createManufacturers() {
        const createTable = this.db.prepare(`CREATE TABLE manufacturers(
                         full_name text NOT NULL UNIQUE,
                         short_name text NOT NULL UNIQUE,
                         website text);`);

        const runQuery = this.db.transaction(() => {
            createTable.run();
            const createIndex1 = this.db.prepare(`CREATE UNIQUE INDEX idx_manufact_full
                         ON manufacturers(full_name);`);
            const createIndex2 = this.db.prepare(`CREATE UNIQUE INDEX idx_manufact_short
                         ON manufacturers(short_name);`);
            createIndex1.run();
            createIndex2.run();
        })
        runQuery();
    }

    createAbbreviations() {
        const createTable = this.db.prepare(`CREATE TABLE abbreviations(
                         full_text text NOT NULL UNIQUE,
                         short_text text NOT NULL UNIQUE);`);

        const runQuery = this.db.transaction(() => {
            createTable.run();
            const createIndex1 = this.db.prepare(`CREATE UNIQUE INDEX idx_abbrev_full
                         ON abbreviations(full_text);`);
            createIndex1.run();
        })
        runQuery();
    }

    populateManufacturers(data) {
        // [[full_name, short_name, website], ... ]
        const query = this.db.prepare(`INSERT OR REPLACE INTO manufacturers (full_name, short_name, website) VALUES (?, ?, ?);`)
        const popManu = this.db.transaction((data) => {
            data.forEach(item => {
                query.run(item);
            })
        })
        popManu(data);
    }

    populateAbbreviations(data) {
        // [[full_name, short_name, website], ... ]
        const query = this.db.prepare(`INSERT OR REPLACE INTO abbreviations (full_text, short_text) VALUES (?, ?);`)
        const pop = this.db.transaction((data) => {
            data.forEach(item => {
                query.run(item);
            })
        })
        pop(data);
    }

    isManufacturer(name) {
        const query = this.db.prepare('SELECT short_name FROM manufacturers WHERE full_name = ?');
        const result = query.get(name);
        return result
    }

    isAbbreviation(phrase) {
        const query = this.db.prepare('SELECT short_text FROM abbreviations WHERE full_text = ?');
        const result = query.get(phrase);
        return result
    }
}

module.exports = Database