const TransDB = require('./asset_translation_excel.js')
const Exceljs = require('exceljs');
const path = require('path');
const fs = require('fs');
const { debug } = require('console');

class AssetTranslateDescription {
    async translate(params) {
        // filename, wsname, language, siteid
        // outputs csv files to the same folder 4 sheets, Asset, location, pm, jobplan
        let excel = new TransDB(params.wb_translation);
        const lookups = await excel.getDescriptors();
        const lang_code = lookups.sites[params["siteid"]].langcode.toLowerCase();
        const org_id = lookups.sites[params["siteid"]].orgid;
        const translations = await excel.getAssetDescription(lang_code);
        let folder = path.dirname(params.wb_pms);
        let date = new Date();
        let i = 0;

        let new_folder = path.join(folder, `${date.toDateString()}(${i})`);
        try { // cause access throws error if path does not exist, undefined??? if it does
            while (fs.accessSync(new_folder) === undefined) {
                i = i + 1
                new_folder = path.join(folder, `${date.toDateString()}(${i})`);
            }
        } catch (err) {
            fs.mkdirSync(new_folder);
        }

        // output location
        const options = {
            formatterOptions: {
                delimiter: ',',
                quote: '"',
                writeBOM: true,
            }
        }

        let logbook = new Exceljs.Workbook()
        let logsheet = logbook.addWorksheet('log');

        // write locations sheet
        let wb = new Exceljs.Workbook()
        let ws = wb.addWorksheet('locations');
        ws.addRow(['IKO_Import', 'IKO_LOCATION', 'AddChange', lang_code.toUpperCase()]);
        ws.addRow(['SITEID', 'LOCATION', 'DESCRIPTION']);
        for (const asset in translations) {
            if (translations[asset].assetid) {
                ws.addRow([translations[asset].siteid, `L-${translations[asset].assetid}`, translations[asset].translated])
            }

        }
        await wb.csv.writeFile(path.join(new_folder, 'location.csv'), options)

        // write assets sheet
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('assets');
        ws.addRow(['IKO_Import', 'IKO_ASSET', 'AddChange', lang_code.toUpperCase()]);
        ws.addRow(['SITEID', 'ASSETNUM', 'DESCRIPTION']);
        for (const asset in translations) {
            if (translations[asset].assetid) {
                ws.addRow([translations[asset].siteid, `${translations[asset].assetid}`, translations[asset].translated])
            }
        }
        await wb.csv.writeFile(path.join(new_folder, 'asset.csv'), options)

        //get jobplan information
        excel = new TransDB(params.wb_pms);
        const jps = await excel.ReadColumns(['jpnum', 'description', 'siteid'])
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('jobplans');
        ws.addRow(['IKO_Import', 'IKO_JOBPLAN', 'AddChange', lang_code.toUpperCase()]);
        ws.addRow(['JPNUM', 'SITEID', 'DESCRIPTION', 'PLUSCREVNUM', 'ORGID']);
        let thing;
        for (const jp in jps) {
            thing = this.NumParser(jps[jp], {}, lookups);
            jps[jp]['translated_description'] = this.translateDescription(jps[jp], lookups, translations, logsheet, thing, lang_code)
            if (thing.type === 'sjp') {
                ws.addRow([jps[jp]['jpnum'], '', jps[jp]['translated_description'], 0, ''])
            } else {
                ws.addRow([jps[jp]['jpnum'], jps[jp]['siteid'], jps[jp]['translated_description'], 0, org_id])
            }

        }
        await wb.csv.writeFile(path.join(new_folder, 'jobplans.csv'), options)

        const pms = await excel.ReadColumns(['pmnum', 'description', 'siteid'])
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('pms');
        ws.addRow(['IKO_Import', 'IKO_PM', 'AddChange', lang_code.toUpperCase()]);
        ws.addRow(['PMNUM', 'SITEID', 'DESCRIPTION']);
        for (const pm in pms) {
            thing = this.NumParser(pms[pm], {}, lookups);
            pms[pm]['translated_description'] = this.translateDescription(pms[pm], lookups, translations, logsheet, thing, lang_code)
            ws.addRow([pms[pm]['pmnum'], pms[pm]['siteid'], pms[pm]['translated_description']])
        }
        await wb.csv.writeFile(path.join(new_folder, 'pms.csv'), options)

        await logbook.csv.writeFile(path.join(new_folder, 'logs.csv'))

        postMessage(['result', 'done']);
    }


    translateDescription(info, lookups, translations, logsheet, thing, lang_code) {
        // returns translated description
        let translated = ''
        if (thing.type === 'sjp') {
            let temp = translations[`${lang_code}${thing.route_name.toLowerCase().replace(/\s/g, " ")}`] //Check for empty data
            //https://stackoverflow.com/questions/22036576/why-does-the-javascript-string-whitespace-character-nbsp-not-match
            if (temp) {
                translated = `${temp.translated.trim()} - `
            } else {
                logsheet.addRow(['Require Translation', thing.route_name, lang_code])
            }
            temp = lookups.worktype[`${lang_code}${thing.sjp}`]
            if (temp) {
                translated = `${translated}${temp}`
            } else {
                logsheet.addRow(['Require Translation', thing.sjp, lang_code])
            }

        } else if (thing.type === 'pm' || thing.type === 'pmjp') {
            let temp = translations[`${lang_code}${thing.route_name.toLowerCase().replace(/\s/g, " ")}`]
            if (temp) {
                translated = `${temp.translated.trim()} - `
            } else {
                logsheet.addRow(['Require Translation', thing.route_name, lang_code, 'Route'])
            }
            temp = `${lang_code}${thing.freq.slice(0, 1)}`
            if (thing.freq.slice(1) > 1) {
                temp = `${temp}s`
            }
            translated = `${translated}${thing.freq.slice(1)} ${lookups.frequency[temp]} - `
            if (thing.worktype.indexOf('lc') != -1) {
                temp = lookups.worktype[`${lang_code}${thing.worktype.slice(0, 2)}`]
                temp = `${temp}${String.fromCharCode(64 + parseInt(thing.worktype.slice(2)))}`
                translated = `${translated}${temp}`
                temp = translations[`${lang_code}${thing.suffix?.replace(/\s/g, " ").toLowerCase()}`]
                if (temp) {
                    translated = `${translated} ${temp.translated}`
                } else {
                    logsheet.addRow(['Require Translation', thing.suffix, lang_code, 'Part'])
                }
            } else {
                translated = `${translated}${lookups.worktype[`${lang_code}${thing.worktype}`]} - ${lookups.labortype[`${lang_code}${thing.labor}`]}`
            }

        } else {
            logsheet.addRow(['Unknown Format', info.description, lang_code,])
        }

        if (translated.length > 100) {
            logsheet.addRow(['Description Length', info.description, lang_code, translated.length, translated])
        }
        return translated
    }

    NumParser(info, specs, lookups) {
        // always match from beginning
        const route_regex = /^\w{1,3}\d{1,4}/g; //matches routes / asset numbers
        const freq_regex = /^(d|w|m|y)\d+/g; //matches frequency
        const work_regex = /^\w{3}/g; //matches work type
        const lc_regex = /^lf\d{1}/g; // matches lifecycle
        const labor_regex = /^o|m|e/g; //matches labor type
        const dup_regex = /^\d*$/g; //matches duplicate pm number
        const lc_item = /(?<=LC-\w+\s).*/g;
        const freqs = {
            d: 'day',
            w: 'week',
            m: 'month',
            y: 'year'
        }
        const sjp_type = {
            bde: 'Breakdown - Electrical',
            bdm: 'Breakdown - Mechanical',
            bdo: 'Breakdown - Operational',
            core: 'Corrective - Post-Repair - Electrical',
            corm: 'Corrective - Post-Repair - Mechanical',
            epie: 'Equipment/Process Improvement - Electrical',
            epim: 'Equipment/Process Improvement - Mechanical',
            hkgm: 'Housekeeping',
            inae: 'Inspection - Ad Hoc - Electrical',
            inam: 'Inspection - Ad Hoc - Mechanical',
            peme: 'Pre-emptive Maintenance - Electrical',
            pemm: 'Pre-emptive Maintenance - Mechanical',
            rece: 'Recondition - Electrical',
            recm: 'Recondition - Mechanical',
            safe: 'Safety - Electrical',
            safm: 'Safety - Mechanical',
            tshe: 'Troubleshooting - Electrical',
            tshm: 'Troubleshooting - Mechanical',
            stge: 'Standing - Electrical',
            stgo: 'Standing - Production',
            stgm: 'Standing - Mechanical'
        }

        let text = (info.pmnum || info.jpnum).toLowerCase()

        if (text.length < 10 && sjp_type[text.slice(5)]) {
            specs['sjp'] = text.slice(5)
            specs['route_name'] = info.description.slice(0, info.description.length - sjp_type[specs['sjp']].length - 2).trim()
            specs['route'] = text.slice(0, 5)
            specs['type'] = 'sjp'
        } else {
            // check if site pm jp (has siteid in num)
            let match = text.slice(0, 2)
            if (lookups.sites[match]) {
                text = text.slice(2)
                specs['siteid'] = match
                specs['type'] = 'pmjp'
            } else if (lookups.sites[text.slice(0, 3)]) {
                text = text.slice(3)
                specs['siteid'] = text.slice(0, 3)
                specs['type'] = 'pmjp'
            } else {
                specs['type'] = 'pm'
            }

            match = text.match(route_regex);
            if (match != null) {
                specs['route'] = match[0]
                text = text.slice(specs['route'].length)
            } else {
                console.log('no asset number / route match')
            }

            match = text.match(freq_regex);
            if (match != null) {
                specs['freq'] = match[0]
                text = text.slice(specs['freq'].length)
                const route_desc_regex = new RegExp(`.*(?=-\\s*${specs['freq'].slice(1)} ${freqs[specs['freq'].slice(0, 1)]})`, 'ig')
                match = info.description.match(route_desc_regex)
                try {
                    specs['route_name'] = match[0].trim()
                } catch (error) {
                    specs['route_name'] = 'number & description mismatch'
                    console.log('number & description mismatch')
                    console.log(info.description)
                }

            } else {
                // possibly standard site job plan
                console.log('no frequency found')
            }

            match = text.match(work_regex);
            if (match != null) {
                specs['worktype'] = match[0]
                text = text.slice(specs['worktype'].length)
                specs['suffix'] = info.description.match(lc_item)?.[0]
            }

            match = text.match(labor_regex);
            if (match != null) {
                specs['labor'] = match[0]
                text = text.slice(specs['labor'].length)
            } else {
                console.log('no labor found')
            }
            try {
                specs['dup'] = parseInt(text)
            } catch (error) {
                console.log('bad dup number')
                console.log(specs['dup'])
            }
        }
        return specs
    }

    ReverseSplit(str) {
        let chars = str.split('')
        let result = []
        let hyphens = 0; // only split into 4 sections
        let previous = chars.length
        for (let i = chars.length; i >= 0; i--) {
            if (chars[i] === '-') {
                // make sure pre-emptive is not split
                try {
                    if (chars.slice(i - 3, i) != 'pre' && chars.slice(i, i + 7) != 'emptive') {
                        result[3 - hyphens] = chars.slice(i + 1, previous).join('').trim();
                        hyphens++;
                        previous = i
                    }
                    if (result[1]) {
                        result[0] = chars.slice(0, i).join('').trim();
                        break
                    }
                } catch (e) {
                    console.log(e)
                }
            }
        }
        return result
    }
}


module.exports = AssetTranslateDescription