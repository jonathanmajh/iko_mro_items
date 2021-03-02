const Database = require('./indexDB')
const ExcelReader = require('./spreadsheet')
const utils = require('./utils')

class ManufacturerValidator {
    constructor() {
        this.CHAR_LIMIT = 30;
        this.db = new Database;
    }

    async validateSingle(split_desc) {
        let manufacturer = false;
        // look from end of string since manufacturer name is mostly likely in last description
        for (let i=split_desc.length-1; i>=0; i--) {
            postMessage(['debug', `Looking for manufacturer named: "${split_desc[i]}"`]);
            manufacturer = await this.db.isManufacturer(split_desc[i]);
            if (manufacturer) {
                postMessage(['debug', `Found manufacturer with short name: "${manufacturer.short_name}"`]);
                split_desc.splice(i, 1); //remove the manufactuer and re-add the short version to the end
                split_desc.push(manufacturer.short_name);
                return split_desc
            }
        }
    }
}

class PhraseReplacer {
    constructor() {
        this.db = new Database;
    }

    async replaceAbbreviated(split_desc) {
        let replacement = false;
        for (let i=0; i<split_desc.length; i++) {
            // look for replacements for phrases
            replacement = await this.db.isAbbreviation(split_desc[i]);
            if(replacement) {
                postMessage(['debug', `Replacing: "${split_desc[i]} with: ${replacement.replace_text}"`]);
                split_desc[i] = replacement.replace_text;
            }
            // look for replacement for individual words
            let word_split = utils.inOrderCombinations(split_desc[i].split(' '));
            replacement = false
            for (let j=word_split.length-1; j>0; j--) {
                replacement = await this.db.isAbbreviation(word_split[j].join(' '));
                if(replacement) {
                    postMessage(['debug', `Replacing: "${word_split[j].join(' ')} with: ${replacement.replace_text}"`]);
                    split_desc[i] = split_desc[i].replace(word_split[j].join(' '),  replacement.replace_text)
                }
            }
        }
        return split_desc
    }
}

class Validate {
    async validateSingle(raw_desc) {
        raw_desc = raw_desc.split(',');
        let split_desc = [];
        raw_desc.forEach(desc => {
            split_desc.push(desc.trim());
        });
        postMessage(['debug', `Validating: "${split_desc}"`]);
        let manuValid = new ManufacturerValidator();
        let manu = await manuValid.validateSingle(split_desc);
        if (!manu) {
            postMessage(['debug', `No manufacturer found in: "${raw_desc}"`]);
        } else {
            split_desc = manu;
        }
        let replace = new PhraseReplacer();
        let replaced = await replace.replaceAbbreviated(split_desc);
        if (replaced) {
            split_desc = replaced;
        } else {
            postMessage(['debug', `No words need to be replaced`]);
        }
        let result = this.assembleDescription(split_desc);
        return result;
    }

    async validateTriple(raw_desc) {
        let value = raw_desc[0]
        if (raw_desc[1]) {
            value = `${value},${raw_desc[1]}`;
        }
        if (raw_desc[2]) {
            value = `${value},${raw_desc[2]}`;
        }
        return await this.validateSingle(value);
    }

    async validateBatch(filePath) {
        postMessage(['debug', `Selected file path: "${filePath}"`]);
        filePath = filePath[0]
        let excel = new ExcelReader(filePath);
        let result = excel.getDescriptions();
        for (let i=0; i<result.length; i++) {
            result[i].result = await this.validateSingle(result[i].value);
        }
        filePath = filePath.split('.');
        filePath = `${filePath[0]}_Validated.${filePath[1]}`;
        filePath = excel.writeDescriptions(result, filePath);
        return(filePath);
    }

    assembleDescription(split_desc) {
        // consolelog(split_desc)
        let descriptions = ['', '', '', ''];
        for (let i = 0; i < split_desc.length - 1; i++) {
            split_desc[i] = `${split_desc[i]},`
        }
        let position = 0
        for (let j=0; j<split_desc.length; j++) {
            if (j + 1 === split_desc.length) {
                for (let i=0;i<3;i++) {
                    if (descriptions[i][descriptions[i].length-1]===',') {
                        descriptions[i] = descriptions[i].slice(0,-1) //remove trailing comma
                    }
                }
                descriptions[2] = `${descriptions[2]}${split_desc[j]}`;
                descriptions[3] = descriptions[0]
                if (descriptions[1]) {
                    descriptions[3] = `${descriptions[3]},${descriptions[1]}`;
                }
                if (descriptions[2]) {
                    descriptions[3] = `${descriptions[3]},${descriptions[2]}`;
                }
                if (descriptions[0].length > 30 || descriptions[1].length > 30 || descriptions[2].length > 30 || descriptions[3] > 90) {
                    postMessage(['info', `${descriptions[0]}, ${descriptions[1]}, ${descriptions[2]}, ${descriptions[3]}`])
                    postMessage(['error', 'Description is too long'])
                    return descriptions
                } else {
                    postMessage(['debug', 'Description length is in spec'])
                    return descriptions
                }
            }
            for (let i=position; i<3; i++) {
                if ((descriptions[i].length - 1) + split_desc[j].length <= 30) { //minus one since the comma would be removed
                    descriptions[i] = `${descriptions[i]}${split_desc[j]}`;
                    break;
                } else {
                    position = i + 1 //prevents description getting rearranged due to a second string being shorter than the first
                }
            }
        }
    }
}

module.exports = Validate