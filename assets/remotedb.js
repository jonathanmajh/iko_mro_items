const Sql = require('better-sqlite3');
const zip = require("@zip.js/zip.js");
const fs = require('fs');
const Maximo = require('./maximo.js');
const paths = require('./paths');

/**
  * Database class to open remote zip database files
  */
class RemoteDatabase {
    /**
     * Download remote zip file and extract database
     * initialize sqlite db from extracted file
     */
    constructor() {
        this.url = 'https://iko-proxy.jonathanmajh.workers.dev/program.zip';
        this.dbPath = paths.programDb();
        this.version = 'Error';
        this.maximo = new Maximo();
    }

    async getVersion() {
        const response = await this.maximo.proxy('https://iko-proxy.jonathanmajh.workers.dev/.version');
        if (response) {
            this.version = Buffer.from(response).toString('utf8').trim();
        }
        return this.version;
    }

    async downloadAndExtract() {
        const response = await this.maximo.proxy(this.url);
        if (!response) {
            throw new Error('Failed to download database via Maximo proxy');
        }

        const reader = new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(response)));
        const entries = await reader.getEntries();
        for (const entry of entries) {
            if (entry.filename.endsWith('.db')) {
                const blob = await entry.getData(new zip.BlobWriter());
                const arrayBuffer = await blob.arrayBuffer();
                fs.writeFileSync(this.dbPath, Buffer.from(arrayBuffer));
                // this.initializeDB();
            }
        }
        await reader.close();
    }

    initializeDB() {
        this.db = new Sql(this.dbPath);
        console.log('Database initialized');
        let stmt;
        stmt = this.db.prepare('select * from itemCache limit 1;');
        const row = stmt.get();
        console.log(row);
    }
}

module.exports = RemoteDatabase;