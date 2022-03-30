const { SqliteError } = require('better-sqlite3');
const sql = require('better-sqlite3');

class TranslationDatabase {
    constructor() {
        // save location is in user %appdata%
        this.db = new sql(`${process.env.APPDATA}/IKO Reliability Tool/translist.db`);//, { verbose: console.log });
    }

    // save updated translation information
    refreshData(data) {
        // {english:string, lang_code:string, translation:string}
        // need to check for duplicate english since that is not allowed
        const dropTables = this.db.prepare('DROP TABLE IF EXISTS translations');
        const runQuery2 = this.db.transaction(() => {
            dropTables.run();
        });
        runQuery2();
        const createTranslationTable = this.db.prepare(
            `CREATE TABLE translations(
            translate_id INTEGER PRIMARY KEY,
            english TEXT NOT NULL COLLATE NOCASE,
            lang_code TEXT NOT NULL,
            translation TEXT NOT NULL,
            UNIQUE(english, lang_code)
            );`);
        const runQuery = this.db.transaction(() => {
            createTranslationTable.run();
        });
        runQuery();
        const insert = this.db.prepare(`INSERT INTO translations (
            english, lang_code, translation)
            VALUES (@english, @lang_code, @translation)`);
        const insertMany = this.db.transaction((data) => {
            for (const translation of data) {
                try {
                    insert.run(translation);
                } catch (SqliteError) {
                    postMessage(['debug', SqliteError.message]);
                    console.log(SqliteError.message);
                    if (SqliteError.code == "SQLITE_CONSTRAINT_UNIQUE") {
                        postMessage(['error', 'Duplicate Value in English']);
                    }
                }
            }
        });
        insertMany(data);
        postMessage(['result', 'complete']);
    }

    // get translation of a word in the requested language
    getTranslation(lang_code, word) {
        const sql = this.db.prepare('SELECT * FROM translations WHERE lang_code = @lang_code AND english = @word');
        const result = sql.all({lang_code: lang_code.toUpperCase(), word: word});
        if (result.length === 1) {
            return result[0].translation;
        } else {
            return false;
        }
    }

    //get list of languages currently in database
    getLanguages() {
        const sql = this.db.prepare('SELECT DISTINCT lang_code FROM translations');
        const result = sql.all();
        let langs = [];
        for (const lang of result) {
            langs.push(lang.lang_code);
        }
        return langs;
    }
}

module.exports = TranslationDatabase;