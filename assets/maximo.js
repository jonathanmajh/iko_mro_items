const intersection = require('lodash.intersection');
//https://lodash.com/docs/4.17.15#intersection
// fast library for intersection of arrays

itemDict = {};

class Maximo {
    constructor() { }
    async findRelated(data) {
        const phrases = data.split(',');
        let promises = []
        postMessage(['progress', 25, "Getting Item Descriptions From Maximo"])
        for (let i = 0; i < phrases.length; i++) {
            promises.push(fetchAndObjectify(phrases[i]))
        }
        Promise.all(promises).then(maximoItems => {
            postMessage(['progress', 75, "Processing Item Descriptions From Maximo"])
            maximoItems = maximoItems.filter(item => item !== false);
            if (maximoItems.length) {
                let arrayAsNum = [...Array(maximoItems.length).keys()] //create an array with only integers to find combinations
                arrayAsNum = getCombinations(arrayAsNum);
                let intersections = []
                for (let i = arrayAsNum.length; i > 0; i--) { //convert combination of integers to combination of arrays
                    let holder = [];
                    arrayAsNum[i - 1].forEach(index => {
                        holder.push(maximoItems[index]);
                    });
                    intersections.push([holder.length, intersection(...holder)])
                }
                postMessage(['result', matchAndScore(intersections), itemDict, data]);
            } else {
                postMessage(['warning', 'No related items returned from Maximo']);
                postMessage(['result', false]);
            }
        })
    }
}

function matchAndScore(data) {
    postMessage(['progress', 80, "Processing Item Descriptions From Maximo"])
    const numPhases = data[0][0];
    let matchedScores = {};
    let saved = {};
    data.forEach(item => {
        let score = item[0] / numPhases;
        if (!(score in matchedScores)) {
            matchedScores[score] = [];
        }
        item[1].forEach(itemNum => {
            if (!(itemNum in saved)) {
                matchedScores[score].push(itemNum);
                saved[itemNum] = 1;
            }
        });
    });
    return matchedScores;
}

async function fetchAndObjectify(phrase) {
    postMessage(['debug', `Sending request to Maximo for: "${phrase}"`]);
    let response;
    try {
        response = await fetch(`http://nscandacmaxapp1/maxrest/rest/mbo/item?DESCRIPTION=${phrase}&_includecols=itemnum,description&_format=json&_compact=1&_lid=corcoop3&_lpwd=maximo`);
    } catch (err) {
        postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
        return false;
    }
    let content = await response.json();
    let itemNums = [];
    content['ITEMMboSet']['ITEM'].forEach(item => {
        itemNums.push(item['ITEMNUM']);
        itemDict[item['ITEMNUM']] = item['DESCRIPTION']
    });
    return itemNums;
}

//https://stackoverflow.com/a/59942031
//Generate all possible non duplicate combinations of the arrays
function getCombinations(valuesArray) {

    var combi = [];
    var temp = [];
    var slent = Math.pow(2, valuesArray.length);

    for (var i = 0; i < slent; i++) {
        temp = [];
        for (var j = 0; j < valuesArray.length; j++) {
            if ((i & Math.pow(2, j))) {
                temp.push(valuesArray[j]);
            }
        }
        if (temp.length > 0) {
            combi.push(temp);
        }
    }

    combi.sort((a, b) => a.length - b.length);
    return combi;
}

module.exports = Maximo
