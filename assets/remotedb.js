const zip = require("@zip.js/zip.js");
const fs = require('fs');
const path = require('path');
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
        // Live database path (kept for compatibility). Never write the
        // download here: overwriting the live file while handles are open
        // causes SQLITE_BUSY and wipes the settings table (saved API key).
        this.dbPath = paths.programDb();
        this.tmpPath = path.join(paths.appDir(), 'program.remote.db');
        this.version = 'Error';
    }

    // Use a short-lived Maximo (which holds program.db open) so we don't
    // leak a Database handle for the lifetime of this object.
    async _withMaximo(fn) {
        const maximo = new Maximo();
        try {
            return await fn(maximo);
        } finally {
            if (typeof maximo.close === 'function') {
                maximo.close();
            }
        }
    }

    async getVersion() {
        return this._withMaximo(async (maximo) => {
            const response = await maximo.proxy('https://iko-proxy.jonathanmajh.workers.dev/.version');
            if (response) {
                this.version = Buffer.from(response).toString('utf8').trim();
            }
            return this.version;
        });
    }

    async downloadAndExtract() {
        const dbBytes = await this._withMaximo(async (maximo) => {
            const response = await maximo.proxy(this.url);
            if (!response) {
                throw new Error('Failed to download database via Maximo proxy');
            }

            const reader = new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(response)));
            try {
                const entries = await reader.getEntries();
                for (const entry of entries) {
                    if (entry.filename.endsWith('.db')) {
                        const blob = await entry.getData(new zip.BlobWriter());
                        const arrayBuffer = await blob.arrayBuffer();
                        return Buffer.from(arrayBuffer);
                    }
                }
            } finally {
                await reader.close();
            }
            throw new Error('No .db entry found in remote program.zip');
        });

        fs.mkdirSync(paths.appDir(), { recursive: true });
        fs.writeFileSync(this.tmpPath, dbBytes);
        return this.tmpPath;
    }

    cleanup() {
        try {
            if (this.tmpPath && fs.existsSync(this.tmpPath)) {
                fs.unlinkSync(this.tmpPath);
            }
        } catch (_e) {
            // best-effort temp cleanup
        }
    }
}

module.exports = RemoteDatabase;
