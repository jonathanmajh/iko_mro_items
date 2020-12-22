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

    /* TODO rewright with better sqlite3
    createManufacturers() {
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE manufacturers(
                         full_name text NOT NULL UNIQUE,
                         short_name text NOT NULL UNIQUE,
                         website text);`, (err) => {
                if (err) {
                    throw err;
                }
                console.log('created manufacturers table');
            })
                .run(`CREATE UNIQUE INDEX idx_manufact_full
                         ON manufacturers(full_name);`, (err) => {
                    if (err) {
                        throw err;
                    }
                    console.log('created full name index');
                })
                .run(`CREATE UNIQUE INDEX idx_manufact_short
                         ON manufacturers(short_name);`, (err) => {
                    if (err) {
                        throw err;
                    }
                    console.log('created short name index');
                })
        });

    }

    populateManufacturers(data) {
        // [[full_name, short_name, website], ... ]
        let query = `INSERT OR REPLACE INTO manufacturers (full_name, short_name, website) VALUES (?, ?, ?)`
        this.db.parallelize(() => {
            data.forEach(item => {
                this.db.run(query, item, function (err) {
                    if (err) {
                        console.log(`Cannot insert manufacturer ${item}`);
                    } else {
                        console.log(`inserted manufacturer: ${this.lastID}, data: ${item}`)
                    }
                })
            })

        })
    } */

    isManufacturer(name) {
        let query = this.db.prepare('SELECT short_name FROM manufacturers WHERE full_name = ?');
        let result = query.get(name);
        return result
    }
}

module.exports = Database