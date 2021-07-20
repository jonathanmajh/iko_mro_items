const TransDB = require('./translation-sqlite')

//TODO consider doing a cache dictionary before hitting DB
class TranslateDescription {
    translate(params) {
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
                    transDesc.push(replacement)
                } else if (descriptions[i].length > 0) {
                    transDesc.push(descriptions[i])
                    missing.push(descriptions[i])
                }
            } else {
                // if the phrase has numbers then split it by spaces and check each word
                temp = descriptions[i].split(" ");
                if (temp.length > 1) {
                    tempNew = []
                    for (let j = 0; j < temp.length; j++) {
                        if (!hasNumber.test(temp[j])) {
                            // if the word has no numbers translate it
                            replacement = db.getTranslation(params.lang, temp[j]);
                            if (replacement) {
                                tempNew.push(replacement)
                            } else if (temp[j].length > 0) {
                                tempNew.push(temp[j])
                                missing.push(temp[j])
                            }
                        } else {
                            // if it has numbers just leave it as it
                            tempNew.push(temp[j])
                        }
                    }
                } else {
                    tempNew = temp
                }
                // join the individual words back into a phrase
                transDesc.push(tempNew.join(" "));
            }
        }
        // join the phrases back into a description
        return {description: transDesc.join(","), missing: missing}
    }
}

module.exports = TranslateDescription