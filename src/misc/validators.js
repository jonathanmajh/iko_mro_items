const Database = require('./indexDB');
const ExcelReader = require('./spreadsheet');
const utils = require('./utils');

class ManufacturerValidator {
    constructor() {
        this.CHAR_LIMIT = 30;
        this.db = new Database();
    }

    validateSingle(split_desc) {
        let manufacturer = false;
        // look from end of string since manufacturer name is mostly likely in last description
        for (let i=split_desc.length-1; i>=0; i--) {
            postMessage(['debug', `Looking for manufacturer named: "${split_desc[i]}"`]);
            manufacturer = this.db.isManufacturer(split_desc[i]);
            if (manufacturer) {
                postMessage(['debug', `Found manufacturer with short name: "${manufacturer.short_name}"`]);
                split_desc.splice(i, 1); //remove the manufactuer and re-add the short version to the end
                split_desc.push(manufacturer.short_name);
                return split_desc;
            }
        }
    }
}

class PhraseReplacer {
    constructor() {
        this.db = new Database();
    }

    replaceAbbreviated(split_desc) {
        let replacement = false;
        for (let i=0; i<split_desc.length; i++) {
            // look for replacements for phrases
            replacement = this.db.isAbbreviation(split_desc[i].replace('-', ' '));
            if(replacement) {
                postMessage(['debug', `Replacing: "${split_desc[i]} with: ${replacement.replace_text}"`]);
                split_desc[i] = replacement.replace_text;
            }
            // look for replacement for individual words
            let word_split = utils.inOrderCombinations(split_desc[i].split(' '));
            replacement = false;
            for (let j=word_split.length-1; j>0; j--) {
                replacement = this.db.isAbbreviation(word_split[j].join(' ').replace('-', ' '));
                if(replacement) {
                    postMessage(['debug', `Replacing: "${word_split[j].join(' ')} with: ${replacement.replace_text}"`]);
                    split_desc[i] = split_desc[i].replace(word_split[j].join(' '),  replacement.replace_text);
                }
            }
        }
        return split_desc;
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

    async validateBatch(filePath) {
        postMessage(['debug', `Selected file path: "${filePath}"`]);
        filePath = filePath[0];
        let excel = new ExcelReader(filePath);
        let result = await excel.getDescriptions();
        for (let i=0; i<result.length; i++) {
            result[i].result = await this.validateSingle(result[i].value);
        }
        filePath = filePath.split('.');
        filePath = `${filePath[0]}_Validated.${filePath[1]}`;
        filePath = await excel.writeDescriptions(result, filePath);
        return(filePath);
    }

    assembleDescription(split_desc) {
        const db = new Database();
        let descriptions = ['', '', '', '']; // jde1, jde2, jde3, maximo descriptions
        let position = 0; //tracks which part of jde description is being added to
        const regex = /\d+/g;
        for (let i = 0; i < split_desc.length; i++) {
            if (!(split_desc[i].match(regex))) { // if the phrase has no numbers
                split_desc[i] = split_desc[i].toUpperCase();
            }
            // if we are at end of array & the phrase is a manufacturer
            if (i + 1 == split_desc.length && db.isManufacturer(split_desc[i])) {
                if (descriptions[2].length == 0) {
                    descriptions[2] = split_desc[i];
                } else {
                    descriptions[2] = `${descriptions[2]},${split_desc[i]}`;
                }
            }
            // two ifs to avoid trailing / leading commas
            else if (descriptions[position].length == 0) {
                descriptions[position] = split_desc[i];
            } else if (`${descriptions[position]},${split_desc[i]}`.length <= 30) {
                descriptions[position] = `${descriptions[position]},${split_desc[i]}`;
            } else { // if too long put it into next word
                position++;
                if (position == 3) { // if jde is over flowing into Maximo
                    postMessage(['warning', 'Description is too long']);
                } else {
                    descriptions[position] = split_desc[i];
                }
            }
        }
        descriptions[3] = descriptions.slice(0,3).filter(Boolean).join(',');
        return descriptions;
    }
}

module.exports = Validate;