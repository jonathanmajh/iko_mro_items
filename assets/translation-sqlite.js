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

    getTranslation(lang_code, word) {
        const sql = this.db.prepare('SELECT * FROM translations WHERE lang_code = @lang_code AND english = @word');
        const result = sql.all({lang_code: lang_code, word: word})
        if (result.length === 1) {
            return result[0].translation;
        } else {
            return false;
        }
    }

    getLanguages() {
        const sql = this.db.prepare('SELECT DISTINCT lang_code FROM translations');
        const result = sql.all()
        let langs = []
        for (const lang of result) {
            langs.push(lang.lang_code);
        }
        return langs;
    }
}

module.exports = TranslationDatabase