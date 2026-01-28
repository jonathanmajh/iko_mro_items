const Sql = require('better-sqlite3');

const dbPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
/**
  * Database class for setting related queries
  */
class SharedDatabase {
  constructor() {
    this.db = new Sql(`${dbPath}/EAM Spare Parts/program.db`);// , { verbose: console.log });
    const stmt = this.db.prepare('CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)');
    stmt.run();
  }

    /**
  * check if version db was last opened against matches curVersion, updates version in DB
  * @param {String} curVersion running app version
  * @return {boolean} if version is same as db version
  */
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
    try {
      let stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'userid'`);
      const userid = stmt.get()?.value;
      stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'password'`);
      const password = stmt.get()?.value;
      return {userid: userid, password: password};
    } catch (SqliteError) {
      return {userid: '', password: ''};
    }
  }

  loadRemote(remotePath) {
    let stmt;
    this.createTables();
    stmt = this.db.prepare(`ATTACH DATABASE '${remotePath}' AS remoteDB;`);
    stmt.run();
    stmt = this.db.prepare(`INSERT OR REPLACE INTO manufacturers SELECT * FROM remoteDB.manufacturers;`);
    stmt.run();
    stmt = this.db.prepare(`INSERT OR REPLACE INTO abbreviations SELECT * FROM remoteDB.abbreviations;`);
    stmt.run();
    stmt = this.db.prepare(`INSERT OR REPLACE INTO workingDescription SELECT * FROM remoteDB.workingDescription;`);
    stmt.run();
    stmt = this.db.prepare(`INSERT OR REPLACE INTO itemCache SELECT * FROM remoteDB.itemCache;`);
    stmt.run();
    stmt = this.db.prepare(`INSERT OR REPLACE INTO inventoryCache SELECT * FROM remoteDB.inventoryCache;`);
    stmt.run();
    stmt = this.db.prepare(`DETACH DATABASE remoteDB;`);
    stmt.run();
    console.log('loaded remote database');
  }

  createTables() {
    const dropTables = this.db.prepare('DROP TABLE IF EXISTS manufacturers');
    const dropTables2 = this.db.prepare('DROP TABLE IF EXISTS abbreviations');
    const dropTables3 = this.db.prepare('DROP TABLE IF EXISTS workingDescription');
    const dropTables4 = this.db.prepare('DROP TABLE IF EXISTS itemCache');
    const dropTables5 = this.db.prepare('DROP TABLE IF EXISTS itemDescAnalysis');
    const dropTables6 = this.db.prepare('DROP TABLE IF EXISTS inventoryCache');
    const runQuery2 = this.db.transaction(() => {
      dropTables.run();
      dropTables2.run();
      dropTables3.run();
      dropTables4.run();
      dropTables5.run();
      dropTables6.run();
    });
    runQuery2();
    const createTable1 = this.db.prepare(`CREATE TABLE manufacturers(
            id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL COLLATE NOCASE,
            short_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            homepage TEXT,
            changed_date TEXT COLLATE NOCASE
            );`);
    const createTable2 = this.db.prepare(`CREATE TABLE abbreviations(
            id INTEGER PRIMARY KEY,
            orig_text TEXT NOT NULL COLLATE NOCASE,
            replace_text TEXT NOT NULL COLLATE NOCASE
            )`);
    const createTable3 = this.db.prepare(`CREATE TABLE workingDescription (
            row INTEGER NOT NULL,
            description TEXT NOT NULL COLLATE NOCASE,
            analysis TEXT,
            related TEXT,
            translate TEXT,
            orgid TEXT COLLATE NOCASE
        )`);
    const createTable4 = this.db.prepare(`CREATE TABLE itemCache (
            itemnum TEXT PRIMARY KEY,
            description TEXT NOT NULL COLLATE NOCASE,
            details TEXT COLLATE NOCASE,
            changed_date TEXT COLLATE NOCASE,
            search_text TEXT COLLATE NOCASE,
            gl_class TEXT COLLATE NOCASE,
            uom TEXT COLLATE NOCASE,
            commodity_group TEXT COLLATE NOCASE,
            ext_search_text TEXT COLLATE NOCASE,
            ext_description TEXT COLLATE NOCASE
        )`);
    const createTable5 = this.db.prepare(`CREATE TABLE itemDescAnalysis (
            tree TEXT PRIMARY KEY COLLATE NOCASE,
            descriptor TEXT NOT NULL COLLATE NOCASE,
            parent TEXT,
            count INTEGER,
            level INTEGER
        )`);
    const createTable6 = this.db.prepare(`CREATE TABLE inventoryCache (
            itemnum TEXT NOT NULL COLLATE NOCASE,
            siteid TEXT NOT NULL COLLATE NOCASE,
            catalogcode TEXT COLLATE NOCASE,
            modelnum TEXT COLLATE NOCASE,
            vendor TEXT COLLATE NOCASE,
            manufacturer TEXT COLLATE NOCASE,
            companyname TEXT COLLATE NOCASE,
            rowstamp TEXT,
            location TEXT NOT NULL COLLATE NOCASE,
            binnum TEXT COLLATE NOCASE,
            PRIMARY KEY (itemnum, location)
        )`);
    const runQuery = this.db.transaction(() => {
      createTable1.run();
      createTable2.run();
      createTable3.run();
      createTable4.run();
      createTable5.run();
      createTable6.run();
    });
    runQuery();
    console.log('refreshed tables');
  }
}

module.exports = SharedDatabase;
