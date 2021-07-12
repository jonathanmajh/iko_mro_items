const { SqliteError } = require('better-sqlite3');
const sql = require('better-sqlite3')

class TranslationDatabase {
    constructor() {
        this.db = new sql(`${process.env.APPDATA}/iko_utility/translist.db`);//, { verbose: console.log });
    }

    refreshData(data) {
        // {english:string, lang_code:string, translation:string}
        const dropTables = this.db.prepare('DROP TABLE IF EXISTS translations');
        const runQuery2 = this.db.transaction(() => {
            dropTables.run();
        })
        runQuery2();
        const createTranslationTable = this.db.prepare(
            `CREATE TABLE translations(
            translate_id INTEGER PRIMARY KEY,
            english TEXT NOT NULL,
            lang_code TEXT NOT NULL,
            translation TEXT NOT NULL,
            UNIQUE(english, lang_code)
            );`);
        const runQuery = this.db.transaction(() => {
            createTranslationTable.run();
        })
        runQuery();
        const insert = this.db.prepare(`INSERT INTO translations (
            english, lang_code, translation)
            VALUES (@english, @lang_code, @translation)`);
        const insertMany = this.db.transaction((data) => {
            for (const translation of data) insert.run(translation);
        })
        return insertMany(data);
    }
}

module.exports = TranslationDatabase