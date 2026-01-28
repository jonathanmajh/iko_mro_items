const Sql = require('better-sqlite3');
const zip = require("@zip.js/zip.js");
const fs = require('fs');
const path = require('path');
const https = require('https');

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
        this.dbPath = path.join(__dirname, 'program.db');
        this.downloadAndExtract();
    }

    async downloadAndExtract() {
    }

    async extractDatabase() {
        const reader1 = new zip.ZipReader(new zip.HttpReader(this.url));
        const entries = await reader1.getEntries();
        debugger;
        for (const entry of entries) {
            if (entry.filename.endsWith('.db')) {
                const blob = await entry.getData(new zip.BlobWriter());
                const arrayBuffer = await blob.arrayBuffer();
                fs.writeFileSync(this.dbPath, Buffer.from(arrayBuffer));
                this.initializeDB();
            }
        }
        await reader1.close();
    }

    initializeDB() {
        debugger;
        this.db = new Sql(this.dbPath);
        console.log('Database initialized');
        let stmt;
        stmt = this.db.prepare('select * from itemCache limit 1;');
        const row = stmt.get();
        console.log(row);
    }
}

module.exports = RemoteDatabase;