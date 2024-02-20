"use strict";
const TransDB = require('./item-translation-sqlite');
const Database = require('../misc/indexDB');
class TranslateDescription {
    contextTranslate(description, lang_code, result) {
        // translations item description into requested language
        // accounts for context of parent words
        let descriptions = description.split(',');
        const db = new TransDB();
        const db2 = new Database();
        const hasNumber = /\d/; //regex to check for numbers [0-9]
        let temp;
        let tempNew;
        let transDesc = [];
        let replacement;
        let missing = [];
        for (let i = 0; i < descriptions.length; i++) {
            // 1. loop through all phrases (a phrase in this case is the string between commas)
            // if the phrase does not have any numbers try to translate the whole phrase
            for (let j = descriptions.length; j > i; j--) {
                replacement = db.getTranslation(lang_code, descriptions.slice(i, j).join(','));
                if (replacement) {
                    postMessage(['debug', `${descriptions.slice(i, j)} translated to ${replacement}`]);
                    transDesc.push(replacement);
                    i = j - 1;
                    break;
                }
                else if (descriptions.slice(i, j).length > 1) {
                    postMessage(['debug', `${descriptions.slice(i, j).join(',')} has no translation to ${lang_code}`]);
                }
                else {
                    if (!(db2.isManufacturer(descriptions.slice(i, j)))) {
                        postMessage(['debug', `${descriptions.slice(i, j)} has no translation to ${lang_code}`]);
                        temp = descriptions[i].split(" ");
                        if (hasNumber.test(descriptions[i])) {
                            transDesc.push(descriptions[i]);
                        }
                        else if (temp.length == 1) {
                            transDesc.push(descriptions[i]);
                            missing.push(descriptions[i]);
                        }
                        else {
                            // if the phrase has numbers then split it by spaces and check each word
                            tempNew = [];
                            for (let k = 0; k < temp.length; k++) {
                                replacement = db.getTranslation(lang_code, temp[k]);
                                if (replacement) {
                                    tempNew.push(replacement);
                                }
                                else if (temp[k].length > 0) {
                                    tempNew.push(temp[k]);
                                    missing.push(temp[k]);
                                    postMessage(['debug', `${temp[k]} has no translation to ${lang_code}`]);
                                }
                            }
                            // join the individual words back into a phrase
                            transDesc.push(tempNew.join(" "));
                        }
                    }
                    else { // if it is manufacturer
                        transDesc.push(descriptions[i]);
                    }
                }
            }
        }
        // join the phrases back into a description
        if (result == 'post') {
            postMessage(['result', transDesc.join(","), missing]);
        }
        else if (result == 'return') {
            return { description: transDesc.join(","), missing: missing };
        }
        else {
            console.log('no return specified');
            postMessage(['error', 'no return specified']);
        }
    }
    translate(params) {
        // deprecated
        //{description: string, manu: string, lang: string}
        // translations item description into requested language
        let descriptions = params.description.split(",");
        const db = new TransDB();
        const hasNumber = /\d/; //regex to check for numbers [0-9]
        // if a string contains numbers than its probably an item number which doesnt not need to be translated
        let temp;
        let tempNew;
        let transDesc = [];
        let replacement;
        let missing = [];
        for (let i = 0; i < descriptions.length; i++) {
            // 1. loop through all phrases (a phrase in this case is the string between commas)
            if (!hasNumber.test(descriptions[i])) {
                // if the phrase does not have any numbers try to translate the whole phrase
                replacement = db.getTranslation(params.lang, descriptions[i]);
                if (replacement) {
                    transDesc.push(replacement);
                }
                else if (descriptions[i].length > 0) {
                    transDesc.push(descriptions[i]);
                    missing.push(descriptions[i]);
                }
            }
            else {
                // if the phrase has numbers then split it by spaces and check each word
                temp = descriptions[i].split(" ");
                if (temp.length > 1) {
                    tempNew = [];
                    for (let j = 0; j < temp.length; j++) {
                        if (!hasNumber.test(temp[j])) {
                            // if the word has no numbers translate it
                            replacement = db.getTranslation(params.lang, temp[j]);
                            if (replacement) {
                                tempNew.push(replacement);
                            }
                            else if (temp[j].length > 0) {
                                tempNew.push(temp[j]);
                                missing.push(temp[j]);
                            }
                        }
                        else {
                            // if it has numbers just leave it as it
                            tempNew.push(temp[j]);
                        }
                    }
                }
                else {
                    tempNew = temp;
                }
                // join the individual words back into a phrase
                transDesc.push(tempNew.join(" "));
            }
        }
        // join the phrases back into a description
        return { description: transDesc.join(","), missing: missing };
    }
}
module.exports = TranslateDescription;
