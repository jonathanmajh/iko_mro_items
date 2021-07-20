const intersection = require('lodash.intersection');
const Database = require('./indexDB');
//https://lodash.com/docs/4.17.15#intersection
// fast library for intersection of arrays
// various functions for fetching data from maximo rest api

itemDict = {};

class Maximo {
    constructor() { }

    async getMeters() {
        let response;
        let nextpage = true;
        let pageno = 1;
        let meters = [];
        while (nextpage) {
            try {
                response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/iko_meter?pageno=${pageno}&_lpwd=maximo&oslc.pageSize=100&_lid=corcoop3&oslc.select=*&oslc.where=domainid%3D%22M-%25%22`);
            } catch (err) {
                postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
                return false;
            }
            let content = await response.json();
            if (content["oslc:responseInfo"]["oslc:nextPage"]) {
                pageno = pageno + 1;
            } else {
                nextpage = false;
            }
            content["rdfs:member"].forEach(meter => {
                meters.push({
                    list_id: meter["spi:domainid"],
                    inspect: meter["spi:description"].slice(0, meter["spi:description"].length - 9),
                    metername: meter["spi:metername"]
                });
            });
        }
        return meters
    }

    async getObservations() {
        // return meters and observations
        let response;
        let nextpage = true;
        let pageno = 1;
        let meters = [];
        let observations = [];
        while (nextpage) {
            try {
                response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/iko_alndomain?pageno=${pageno}&oslc.where=domainid%3D%22M-%25%22&_lpwd=maximo&oslc.pageSize=100&_lid=corcoop3&oslc.select=alndomain%2Cdomainid%2Cdescription`);
            } catch (err) {
                postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
                return false;
            }
            let content = await response.json();
            if (content["oslc:responseInfo"]["oslc:nextPage"]) {
                pageno = pageno + 1;
            } else {
                nextpage = false;
            }
            content["rdfs:member"].forEach(meter => {
                meters.push({
                    list_id: meter["spi:domainid"],
                    inspect: meter["spi:description"],
                    search_str: `${meter["spi:domainid"]}~${meter["spi:description"]}`
                });
                if (meter["spi:alndomain"]) {
                    meter["spi:alndomain"].forEach(observation => {
                        observations.push({
                            meter: meter["spi:domainid"].slice(2),
                            id_value: observation["spi:value"],
                            observation: observation["spi:description"],
                            search_str: `${meter["spi:domainid"].slice(2)}~${observation["spi:value"]}`
                        })
                    });
                } else {
                    postMessage(['warning', `Meter: ${meter["spi:domainid"]} has no observation codes`]);
                }
            });
        }
        postMessage(['result', [meters, observations]]);
    }

    async findRelated(data) {
        const phrases = data.replaceAll(' ', ',').split(',');
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

    async getNewItems(date) {
        date = date.replace(' ', 'T');
        let response;
        try {
            response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/mxitem?oslc.where=in22>"${date}"&_lid=corcoop3&_lpwd=maximo&oslc.select=itemnum,in22,description`);
        } catch (err) {
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
            return false;
        }
        let content = await response.json();
        let items = [];
        let previousDate = [new Date("2000-01-01"), ''];
        let newDate = '';
        content["rdfs:member"].forEach(item => {
            newDate = item["spi:in22"].replace("T", " ").slice(0, -6)
            items.push([item["spi:itemnum"], item["spi:description"], newDate]);
            if (previousDate[0] < new Date(newDate)) {
                previousDate = [new Date(newDate), newDate]
            }
        });
        return [items, previousDate[1]];
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
    phrase = phrase.toUpperCase()
    postMessage(['debug', `Getting item from cache: "${phrase}"`]);
    const db = new Database()
    let result = await db.db.itemCache.where('search').equals(phrase).toArray()
    let itemNums = [];
    result.forEach(item => {
        itemNums.push(item.itemnum);
        itemDict[item.itemnum] = item.description
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
