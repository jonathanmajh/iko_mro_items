const sql = require('better-sqlite3');
const { SqliteError } = require('better-sqlite3');

class SharedDatabase {
    constructor() {
        this.db = new sql(`${process.env.APPDATA}/iko_utility/program.db`);//, { verbose: console.log });
    }

    // check if version db was last opened against matches curVersion, updates version in DB
    checkVersion(curVersion) {
        let stmt;
        let lastVersion = '0.0.0'
        try {
            stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'version'`)
            lastVersion = stmt.get()['value']
        } catch (SqliteError) {
            stmt = this.db.prepare('CREATE TABLE settings(id INTEGER PRIMARY KEY, key TEXT NOT NULL, value TEXT NOT NULL)')
            stmt.run()
            stmt = this.db.prepare(`INSERT INTO settings(key, value) VALUES ('version', '${curVersion}')`)
            stmt.run()
        }
        return (lastVersion == curVersion)
    }
}

module.exports = SharedDatabase