const sql = require('better-sqlite3');
const { SqliteError } = require('better-sqlite3');

class SharedDatabase {
    constructor() {
        this.db = new sql(`${process.env.APPDATA}/IKO Reliability Tool/program.db`);//, { verbose: console.log });
    }

    // check if version db was last opened against matches curVersion, updates version in DB
    checkVersion(curVersion) {
        let stmt;
        let lastVersion = '0.0.0';
        try {
            stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'version'`);
            lastVersion = stmt.get()['value'];
            stmt = this.db.prepare(`UPDATE settings SET value = '${curVersion}' WHERE key = 'version'`);
            stmt.run();
        } catch (SqliteError) {
            stmt = this.db.prepare('CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, key TEXT NOT NULL, value TEXT NOT NULL)');
            stmt.run();
            stmt = this.db.prepare(`INSERT INTO settings(key, value) VALUES ('version', '${curVersion}')`);
            stmt.run();
        }
        return (lastVersion == curVersion);
    }
}

module.exports = SharedDatabase;