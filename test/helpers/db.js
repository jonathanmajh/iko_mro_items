// Seed the temp SQLite databases (program.db + translist.db) used by tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iko-db-'));
process.env.HOME = tmpDir;
process.env.APPDATA = tmpDir;

// The DB helpers resolve to <HOME>/.local/share/EAM Spare Parts/*.db (Linux).
// better-sqlite3 requires the directory to exist; create it up front.
const APP_DIR = process.platform === 'win32'
  ? path.join(tmpDir, 'EAM Spare Parts')
  : path.join(tmpDir, '.local', 'share', 'EAM Spare Parts');
fs.mkdirSync(APP_DIR, { recursive: true });

globalThis.postMessage = () => {};

export function resetEnv() {
  fs.rmSync(APP_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_DIR, { recursive: true });
}

export function seedTranslationDb() {
  const TransDB = require('../../assets/item_translation/item-translation-sqlite');
  const db = new TransDB();
  db.refreshData([
    { english: 'BOLT', lang_code: 'FR', translation: 'BOULON' },
    { english: 'WASHER', lang_code: 'FR', translation: 'RONDELLE' },
    { english: 'NUT', lang_code: 'FR', translation: 'ECROU' },
    { english: 'M8', lang_code: 'FR', translation: 'M8' },
  ]);
  return db;
}

export function seedItemDb() {
  const Database = require('../../assets/indexDB');
  const db = new Database();
  db.createTables();
  db.saveManufacturers([
    ['BOSCH', '2024-01-01', 'Robert Bosch GmbH', 'https://bosch.com'],
  ]);
  db.populateAbbr([['HD', 'HEAVY DUTY']]);
  return db;
}