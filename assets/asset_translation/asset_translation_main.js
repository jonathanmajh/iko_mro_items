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
        const translations = await excel.getAssetDescription();
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
            }
        }

        // write locations sheet
        let wb = new Exceljs.Workbook()
        let ws = wb.addWorksheet('locations');
        ws.addRow(['IKO_Import', 'IKO_LOCATION', 'AddChange', 'FR']);
        ws.addRow(['SITEID', 'LOCATION', 'DESCRIPTION']);
        for (const asset in translations) {
            ws.addRow([translations[asset].siteid, `L-${translations[asset].assetid}`, translations[asset].translated])
        }
        await wb.csv.writeFile(path.join(new_folder, 'location.csv'), options)

        // write assets sheet
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('assets');
        ws.addRow(['IKO_Import', 'IKO_ASSET', 'AddChange', 'FR']);
        ws.addRow(['SITEID', 'ASSETNUM', 'DESCRIPTION']);
        for (const asset in translations) {
            ws.addRow([translations[asset].siteid, `${translations[asset].assetid}`, translations[asset].translated])
        }
        await wb.csv.writeFile(path.join(new_folder, 'asset.csv'), options)

        //get jobplan information
        excel = new TransDB(params.wb_pms);
        const jps = await excel.ReadColumns(['jpnum', 'description', 'siteid'])
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('jobplans');
        ws.addRow(['IKO_Import', 'IKO_JOBPLAN', 'AddChange', 'FR']);
        ws.addRow(['JPNUM', 'SITEID', 'DESCRIPTION', 'PLUSCREVNUM', 'ORGID']);
        for (const jp in jps) {
            jps[jp]['translated_description'] = this.translateDescription(jps[jp], lookups, translations)
            ws.addRow([jps[jp]['jpnum'], jps[jp]['siteid'], jps[jp]['translated_description'], 0, 'IKO-EU'])
        }
        await wb.csv.writeFile(path.join(new_folder, 'jobplans.csv'), options)

        const pms = await excel.ReadColumns(['pmnum', 'description', 'siteid'])
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('pms');
        ws.addRow(['IKO_Import', 'IKO_PM', 'AddChange', 'FR']);
        ws.addRow(['PMNUM', 'SITEID', 'DESCRIPTION']);
        for (const pm in pms) {
            pms[pm]['translated_description'] = this.translateDescription(pms[pm], lookups, translations)
            ws.addRow([pms[pm]['pmnum'], pms[pm]['siteid'], pms[pm]['translated_description']])
        }
        await wb.csv.writeFile(path.join(new_folder, 'pms.csv'), options)
    }


    translateDescription(info, lookups, translations) {
        let phrases = this.ReverseSplit(info.description.toLowerCase());
        let thing = this.NumParser(info, {}, lookups);
        debugger
        phrases = phrases.map(function (x) { try { return x.trim().toLowerCase(); } catch (err) { undefined } });
        if (phrases.length === 4) {
            // translate asset name
            let temp = translations[`${info.siteid.toLowerCase()}${phrases[0]}`]
            if (temp) {
                phrases[0] = temp.translated
            } else {
                console.log(`no alternative found for ${phrases[0]}`)
            }
            // translate frequency
            temp = phrases[1].split(' ');
            let temp2 = lookups['frequency'][temp[1]]
            if (temp2) {
                temp[1] = temp2
                phrases[1] = temp.join(' ')
            } else {
                console.log(`no alternative found for ${temp[1]}`)
            }
            // translate worktype
            temp = lookups['worktype'][phrases[2]]
            if (temp) {
                phrases[2] = temp
            } else {
                console.log(`no alternative found for ${phrases[2]}`)
            }
            // translate worktype
            temp = lookups['labortype'][phrases[3]]
            if (temp) {
                phrases[3] = temp
            } else {
                console.log(`no alternative found for ${phrases[3]}`)
            }
        } else {
            console.log(`Badly formated description ${info.description} will not be translated`)
        }
        let translated = phrases.join(' - ')
        if (translated.length > 100) {
            console.log(`Warning translated description is too long (>100) ${translated}`)
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
                console.log('not a pm jp')
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
                    console.log('number & description mismatch?')
                }

            } else {
                console.log('no frequency found')
            }

            match = text.match(work_regex);
            if (match != null) {
                specs['worktype'] = match[0]
                text = text.slice(specs['worktype'].length)
            } else {
                match = text.match(lc_regex);
                if (match != null) {
                    specs['worktype'] = match[0]
                    text = text.slice(specs['worktype'].length)
                    specs['suffix'] = info.description.match(lc_item)[0]
                } else {
                    console.log('no worktype found')
                }
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