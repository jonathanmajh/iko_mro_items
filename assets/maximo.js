// various functions for fetching data from maximo rest api
const SharedDatabase = require('../assets/sharedDB');

class Maximo {
    constructor() { 
        this.shareDB = new SharedDatabase();
        this.login = this.shareDB.getPassword();
    }

    async getMeters() {
        let response;
        let nextpage = true;
        let pageno = 1;
        let meters = [];
        while (nextpage) {
            try {
                response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/iko_meter?pageno=${pageno}&_lpwd=${this.login.password}&oslc.pageSize=100&_lid=${this.login.userid}&oslc.select=*&oslc.where=domainid%3D%22M-%25%22`);
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
        return meters;
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
                response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/iko_alndomain?pageno=${pageno}&oslc.where=domainid%3D%22M-%25%22&_lpwd=${this.login.password}&oslc.pageSize=100&_lid=${this.login.userid}&oslc.select=alndomain%2Cdomainid%2Cdescription`);
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
                        });
                    });
                } else {
                    postMessage(['warning', `Meter: ${meter["spi:domainid"]} has no observation codes`]);
                }
            });
        }
        postMessage(['result', [meters, observations]]);
    }

    async getNewItems(date) {
        date = date.replace(' ', 'T');
        let response;
        try {
            response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/mxitem?oslc.where=in22>"${date}" and itemnum="9%25"&_lid=${this.login.userid}&_lpwd=${this.login.password}&oslc.select=itemnum,in22,description,issueunit,commoditygroup,externalrefid,status`);
        } catch (err) {
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
            return false;
        }
        let content = await response.json();
        let items = [];
        let previousDate = [new Date("2000-01-01"), ''];
        let newDate = '';
        if (content["oslc:Error"]) { //content["Error"]["message"]
            postMessage(['warning', content["oslc:Error"]]);
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            content["rdfs:member"].forEach(item => {
                newDate = item["spi:in22"].replace("T", " ").slice(0, -6);
                items.push([
                    item["spi:itemnum"], 
                    item["spi:description"], 
                    newDate,
                    item["spi:externalrefid"], 
                    item["spi:issueunit"], 
                    item["spi:commoditygroup"], 
                ]);
                if (previousDate[0] < new Date(newDate)) {
                    previousDate = [new Date(newDate), newDate];
                }
            });
            return [items, previousDate[1]];
        }
    }

    async getNewManufacturers(date) {
        date = date.replace(' ', 'T');
        let response;
        try {
            response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/IKO_COMPMASTER?oslc.where=type="M" and changedate>"${date}"&oslc.select=company,name,homepage,changedate&_lid=${this.login.userid}&_lpwd=${this.login.password}`);
        } catch (err) {
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
            return false;
        }
        let content = await response.json();
        let items = [];
        let previousDate = [new Date("2000-01-01"), ''];
        let newDate = '';
        if (content["oslc:Error"]) { //content["Error"]["message"]
            postMessage(['warning', content["oslc:Error"]]);
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            content["rdfs:member"].forEach(item => {
                newDate = item["spi:changedate"].replace("T", " ").slice(0, -6);
                items.push([
                    item["spi:company"],
                    newDate, 
                    item["spi:name"], 
                    item["spi:homepage"], 
                ]);
                if (previousDate[0] < new Date(newDate)) {
                    previousDate = [new Date(newDate), newDate];
                }
            });
            return [items, previousDate[1]];
        }
    }

    async getNextItemNumber() {
        let response;
        try {
            // get latest 91* number (will need to be updated to 92 after 200k items have been created in Maximo)
            // %25 is %
            response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/os/mxitem?oslc.where=itemnum="91%25"&_lid=${this.login.userid}&_lpwd=${this.login.password}&oslc.select=itemnum&oslc.pageSize=1&oslc.orderBy=-itemnum`);
            debugger;
        } catch (err) {
            postMessage(['result', 1,'Failed to fetch Data from Maximo, Please Check Network (1)']);
            return false;
        }
        let content = await response.json();
        if (content["oslc:Error"]) { //content["Error"]["message"]
            postMessage(['result', 1, 'Failed to fetch Data from Maximo, Please Check Network (2)']);
        } else {
            let number = content["rdfs:member"][0]['spi:itemnum'];
            number = parseInt(number);
            postMessage(['result', 0, number]);
        }
    }

    async checkLogin(userid = this.login.userid, password = this.login.password) {
        let response;
        try {
            response = await fetch(`http://nscandacmaxapp1/maxrest/oslc/whoami?_lid=${userid}&_lpwd=${password}`);
        } catch (err) {
            postMessage(['result', 1,'Failed to fetch Data from Maximo, Please Check Network (1)']);
            return false;
        }
        let content = await response.json();
        if (content["oslc:Error"]) {
            postMessage(['result', 1, 'Failed to login to Maximo, Please Check User Name & Password']);
            postMessage(['result', 1, content["oslc:Error"]["oslc:message"]]);
            return false;
        } else {
            this.shareDB.savePassword(userid, password);
            this.login.password = password;
            this.login.userid = userid;
            postMessage(['debug', `Successfully logged in to Maximo as: ${content.displayName}`]);
            postMessage(['result', 0, 'Successfully logged in to Maximo']);
            return true;
        }
    }
}

module.exports = Maximo;
