import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iko-test-'));
process.env.HOME = tmpDir;
process.env.APPDATA = tmpDir;

globalThis.postMessage = () => {};

module.exports = {};