"use strict";
const sql = require('better-sqlite3');
class ObservationDatabase {
    constructor() {
        this.db = new sql(`${process.env.APPDATA}/EAM Spare Parts/obserlist.db`); //, { verbose: console.log });
    }
    createTables() {
        const dropTables = this.db.prepare('DROP TABLE IF EXISTS meters');
        const dropTables2 = this.db.prepare('DROP TABLE IF EXISTS observations');
        const dropTables3 = this.db.prepare('DROP TABLE IF EXISTS jobtasks');
        const runQuery2 = this.db.transaction(() => {
            dropTables.run();
            dropTables2.run();
            dropTables3.run();
        });
        runQuery2();
        const createMeterTable = this.db.prepare(`CREATE TABLE meters(
            meter_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            list_id TEXT NOT NULL UNIQUE,
            inspect TEXT NOT NULL,
            desc TEXT NOT NULL,
            ext_desc TEXT NOT NULL,
            in_maximo INT DEFAULT 0,
            search_str TEXT);`);
        const createObservationTable = this.db.prepare(`CREATE TABLE observations(
            observation_id INTEGER PRIMARY KEY,
            meter TEXT NOT NULL,
            id_value TEXT NOT NULL,
            observation TEXT NOT NULL,
            action TEXT,
            in_maximo INT DEFAULT 0,
            search_str TEXT
            )`);
        const createJobTaskTable = this.db.prepare(`CREATE TABLE jobtasks (
            row_id INTEGER PRIMARY KEY,
            jpnum INTEGER NOT NULL,
            metername TEXT NOT NULL,
            orgid TEXT,
            siteid TEXT,
            jptask INTEGER,
            desc TEXT,
            ext_desc TEXT,
            status INT DEFAULT 0
        )`); // 0 = no longer defined, 1 = no change, 2 = need to update
        const runQuery = this.db.transaction(() => {
            createMeterTable.run();
            createObservationTable.run();
            createJobTaskTable.run();
        });
        runQuery();
    }
    close() {
        this.db.close();
    }
    saveJobTasks(data) {
        const insert = this.db.prepare(`INSERT INTO jobtasks (
            jpnum, metername, orgid, siteid, jptask, desc, ext_desc)
            VALUES (@jpnum, @metername, @orgid, @siteid, @jptask, @desc, @ext_desc)`);
        const insertMany = this.db.transaction((data) => {
            for (const jobtask of data)
                insert.run(jobtask);
        });
        insertMany(data);
    }
    insertMeter(data) {
        const insert = this.db.prepare(`INSERT INTO meters (
            name, list_id, inspect, desc, ext_desc, search_str)
            VALUES (@name, @list_id, @inspect, @desc, @ext_desc, @search_str)`);
        const insertMany = this.db.transaction((data) => {
            for (const meter of data) {
                meter.ext_desc = `<div>${meter.ext_desc.replaceAll('\n', '</div>\n<div>')}</div>`;
                insert.run(meter);
            }
        });
        insertMany(data);
    }
    insertObservation(data) {
        const insert = this.db.prepare(`INSERT INTO observations (
            meter, id_value, observation, action, search_str)
            VALUES (@meter, @id_value, @observation, @action, @search_str)`);
        const insertMany = this.db.transaction((data) => {
            for (const meter of data)
                insert.run(meter);
        });
        insertMany(data);
    }
    compareDomainDefinition(list_id, inspect, maximo_table) {
        // true means change will be taken care of when querying for in_maximo=0
        // maximo_table: meters are kept in two places, meters + alndomain, since they are the same the same function can be used, just make sure to make it as such
        let stmt = this.db.prepare('SELECT list_id, inspect FROM meters WHERE list_id = ?');
        const meter = stmt.all(list_id);
        if (meter.length === 1) {
            if (meter[0].inspect == inspect) {
                stmt = this.db.prepare(`UPDATE meters SET in_maximo = ${maximo_table} WHERE list_id = ?`);
                stmt.run(list_id);
                return true;
            }
            else {
                postMessage(['debug', `Update Meter: "${list_id}" changed New: "${meter[0].inspect}" Old: "${inspect}"`]);
                return true;
            }
        }
        else {
            postMessage(['debug', `Old Meter: ${list_id}: ${inspect} can be removed`]);
            return false;
        }
    }
    compareJobTasks() {
        let stmt = this.db.prepare('SELECT name, desc, ext_desc FROM meters');
        const newJobTasks = stmt.all();
        let updatestmt;
        stmt = this.db.prepare('SELECT row_id, jpnum, metername, desc, ext_desc FROM jobtasks WHERE metername = ?');
        for (const newJobTask of newJobTasks) {
            let oldJobTasks = stmt.all(`${newJobTask.name}01`);
            if (oldJobTasks.length != 0) {
                for (const oldJobTask of oldJobTasks) {
                    if (oldJobTask.desc == newJobTask.desc && oldJobTask.ext_desc == newJobTask.ext_desc) {
                        updatestmt = this.db.prepare(`UPDATE jobtasks SET status = 1 WHERE row_id = ?`);
                        updatestmt.run(oldJobTask.row_id);
                    }
                    else {
                        updatestmt = this.db.prepare(`UPDATE jobtasks SET status = 2 WHERE row_id = ?`);
                        updatestmt.run(oldJobTask.row_id);
                    }
                }
            }
            else {
                postMessage(['debug', `Meter: ${newJobTask.name} not used by any existing Job Tasks`]);
            }
        }
    }
    compareDomainValues(search, observation) {
        let stmt = this.db.prepare('SELECT meter, id_value, observation FROM observations WHERE search_str = ?');
        const observ = stmt.all(search);
        if (observ.length === 1) {
            if (observ[0].observation == observation) {
                stmt = this.db.prepare('UPDATE observations SET in_maximo = 1 WHERE search_str = ?');
                stmt.run(search);
                return true;
            }
            else {
                postMessage(['debug', `Update Observation: "${search}" changed New: "${observ[0].observation}" Old: "${observation}"`]);
                return true;
            }
        }
        else {
            postMessage(['debug', `Old Observation: ${search}: ${observation} can be removed`]);
            return false;
        }
    }
    getNewDomainDefinitions() {
        const stmt = this.db.prepare('SELECT list_id, inspect FROM meters WHERE in_maximo = 0');
        const meters = stmt.all();
        return meters;
    }
    getNewMaximoMeters() {
        const stmt = this.db.prepare('SELECT list_id, inspect FROM meters WHERE in_maximo = 0 or in_maximo = 1');
        const meters = stmt.all();
        return meters;
    }
    getNewDomainValues() {
        const stmt = this.db.prepare('SELECT meter, id_value, observation FROM observations WHERE in_maximo = 0');
        const observs = stmt.all();
        return observs;
    }
    getJobTasks(status) {
        const stmt = this.db.prepare(`select t1.jpnum, t1.metername, orgid, siteid, jptask, t2.desc, t2.ext_desc, t1.desc as old_desc, t1.ext_desc as old_ext_desc from
            (select jpnum, metername, orgid, siteid, jptask, desc, ext_desc from jobtasks where status = ?) as t1
            left JOIN
            (select name, desc, ext_desc from meters) as t2
            on substr(t1.metername, 1, length(t1.metername) - 2)=t2.name`);
        const things = stmt.all(status);
        return things;
    }
}
module.exports = ObservationDatabase;
