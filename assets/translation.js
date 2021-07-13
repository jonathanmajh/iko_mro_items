const TransDB = require('./translation-sqlite')

//TODO consider doing a cache dictionary before hitting DB
class TranslateDescription {
    translate(params) {
        //{description: string, manu: string, lang: string}
        //copy split logic from VBA
        let descriptions = params.description.split(",");
        const db = new TransDB();
        const hasNumber = /\d/;
        let temp;
        let tempNew;
        let transDesc = [];
        let replacement;
        let missing = [];
        for (let i = 0; i < descriptions.length; i++) {
            if (!hasNumber.test(descriptions[i])) {
                replacement = db.getTranslation(params.lang, descriptions[i]);
                if (replacement) {
                    transDesc.push(replacement)
                } else if (descriptions[i].length > 0) {
                    transDesc.push(descriptions[i])
                    missing.push(descriptions[i])
                }
            } else {
                temp = descriptions[i].split(" ");
                if (temp.length > 1) {
                    tempNew = []
                    for (let j = 0; j < temp.length; j++) {
                        if (!hasNumber.test(temp[j])) {
                            replacement = db.getTranslation(params.lang, temp[j]);
                            if (replacement) {
                                tempNew.push(replacement)
                            } else if (temp[j].length > 0) {
                                tempNew.push(temp[j])
                                missing.push(temp[j])
                            }
                        } else {
                            tempNew.push(temp[j])
                        }
                    }
                } else {
                    tempNew = temp
                }
                transDesc.push(tempNew.join(" "));
            }
        }
        return {description: transDesc.join(","), missing: missing}
    }
}

module.exports = TranslateDescription