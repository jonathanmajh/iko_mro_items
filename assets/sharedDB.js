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
            lastVersion = stmt.get().value;
            stmt = this.db.prepare(`UPDATE settings SET value = '${curVersion}' WHERE key = 'version'`);
            stmt.run();
        } catch (SqliteError) {
            stmt = this.db.prepare('CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)');
            stmt.run();
            stmt = this.db.prepare(`INSERT INTO settings(key, value) VALUES ('version', '${curVersion}')`);
            stmt.run();
        }
        return (lastVersion == curVersion);
    }

    savePassword(userid, password) {
        let stmt;
        stmt = this.db.prepare('CREATE UNIQUE INDEX if not EXISTS idx_key ON settings(key);'); // patch table to have unique keys
        stmt.run();
        stmt = this.db.prepare(`replace into settings(key, value) VALUES ('userid', '${userid}'), ('password', '${password}')`);
        stmt.run();
    }

    getPassword() {
        let stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'userid'`);
        let userid = stmt.get()?.value;
        stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'password'`);
        let password = stmt.get()?.value;
        return {userid: userid, password:password};
    }
}

module.exports = SharedDatabase;