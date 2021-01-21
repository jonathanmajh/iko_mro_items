var parseString = require('xml2js').parseString;

class XMLParser {
    constructor(raw_data) {
        this.parse = parseString(raw_data, function (err, result) {
            console.log('finished parsing');
            const parse = result['ITEMMboSet']['ITEM'];
            console.log(parse)
            return parse
        })
    }

}

module.exports = XMLParser