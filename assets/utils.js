function getCombinations(valuesArray) {

    let combi = [];
    let temp = [];
    let slent = Math.pow(2, valuesArray.length);

    for (let i = 0; i < slent; i++) {
        temp = [];
        for (let j = 0; j < valuesArray.length; j++) {
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

function inOrderCombinations(valuesArray) {
    let combi = [];
    for (let i = 0; i < valuesArray.length; i++) {
        for (let j = 0; j < valuesArray.length - i; j++) {
            combi.push(valuesArray.slice(j, j + i + 1))
        }
    }
    return combi
}

function splitToTwo() {
// [string] for english
}

function splitToThree() {
    //{description: [string], manu: string}
}

module.exports = { getCombinations, inOrderCombinations };