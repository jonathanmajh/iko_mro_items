const TransDB = require('./asset_translation_excel.js')
const Exceljs = require('exceljs');
const path = require('path');
const fs = require('fs');

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
                delimiter: '|',
                quote: '~',
            }
        }

        // write locations sheet
        let wb = new Exceljs.Workbook()
        let ws = wb.addWorksheet('locations');
        ws.addRow(['IKO_Import', 'IKO_LOCATION', 'AddChange', 'NL']);
        ws.addRow(['SITEID', 'LOCATION', 'DESCRIPTION']);
        for (const asset in translations) {
            ws.addRow([translations[asset].siteid, `L-${translations[asset].assetid}`, translations[asset].translated])
        }
        await wb.csv.writeFile(path.join(new_folder, 'location.csv'), options)

        // write assets sheet
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('assets');
        ws.addRow(['IKO_Import', 'IKO_ASSET', 'AddChange', 'NL']);
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
        ws.addRow(['IKO_Import', 'IKO_JOBPLAN', 'AddChange', 'NL']);
        ws.addRow(['JPNUM', 'SITEID', 'DESCRIPTION', 'PLUSCREVNUM', 'ORGID']);
        for (const jp in jps) {
            jps[jp]['translated_description'] = this.translateDescription(jps[jp]['description'], jps[jp]['siteid'], lookups, translations)
            debugger
            ws.addRow([jps[jp]['jpnum'], jps[jp]['siteid'], jps[jp]['translated_description'], 0, 'IKO-XX'])
        }
        await wb.csv.writeFile(path.join(new_folder, 'jobplans.csv'), options)
        
        const pms = await excel.ReadColumns(['pmnum', 'description', 'siteid'])
        wb = new Exceljs.Workbook()
        ws = wb.addWorksheet('pms');
        ws.addRow(['IKO_Import', 'IKO_PM', 'AddChange', 'NL']);
        ws.addRow(['PMNUM', 'SITEID', 'DESCRIPTION']);
        for (const pm in pms) {
            pms[pm]['translated_description'] = this.translateDescription(pms[pm]['description'], pms[pm]['siteid'], lookups, translations)
            debugger
            ws.addRow([pms[pm]['pmnum'], pms[pm]['siteid'], pms[pm]['translated_description']])
        }
        await wb.csv.writeFile(path.join(new_folder, 'pms.csv'), options)
    }


    translateDescription(description, siteid, lookups, translations) {
        let phrases = this.ReverseSplit(description.toLowerCase())
        phrases = phrases.map(function (x) { try { return x.trim().toLowerCase(); } catch (err) { undefined } })
        if (phrases.length === 4) {
            // translate asset name
            let temp = translations[`${siteid.toLowerCase()}${phrases[0]}`]
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
            console.log(`Badly formated description ${description} will not be translated`)
        }
        let translated = phrases.join(' - ')
        if (translated.length > 100) {
            console.log(`Warning translated description is too long (>100) ${translated}`)
        }
        return translated
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
                        result[3 - hyphens] = chars.slice(i+1, previous).join('').trim();
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