// various functions for fetching data from maximo rest api
const { Duration } = require('luxon');
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
                response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/iko_meter?lean=1&pageno=${pageno}&oslc.pageSize=100&oslc.select=*&oslc.where=domainid%3D%22M-%25%22`, {
                    headers: {
                        "apikey": this.login.userid,
                    }});
            } catch (err) {
                postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
                return false;
            }
            let content = await response.json();
            if (content["responseInfo"]["nextPage"]) {
                pageno = pageno + 1;
            } else {
                nextpage = false;
            }
            content["member"].forEach(meter => {
                meters.push({
                    list_id: meter["domainid"],
                    inspect: meter["description"].slice(0, meter["description"].length - 9),
                    metername: meter["metername"]
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
                response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/iko_alndomain?lean=1&pageno=${pageno}&oslc.where=domainid%3D%22M-%25%22&oslc.pageSize=100&oslc.select=alndomain%2Cdomainid%2Cdescription`, {
                    headers: {
                        "apikey": this.login.userid,
                    }});
            } catch (err) {
                postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
                return false;
            }
            let content = await response.json();
            if (content["responseInfo"]["nextPage"]) {
                pageno = pageno + 1;
            } else {
                nextpage = false;
            }
            content["member"].forEach(meter => {
                meters.push({
                    list_id: meter["domainid"],
                    inspect: meter["description"],
                    search_str: `${meter["domainid"]}~${meter["description"]}`
                });
                if (meter["alndomain"]) {
                    meter["alndomain"].forEach(observation => {
                        observations.push({
                            meter: meter["domainid"].slice(2),
                            id_value: observation["value"],
                            observation: observation["description"],
                            search_str: `${meter["domainid"].slice(2)}~${observation["value"]}`
                        });
                    });
                } else {
                    postMessage(['warning', `Meter: ${meter["domainid"]} has no observation codes`]);
                }
            });
        }
        postMessage(['result', [meters, observations]]);
    }

    async getNewItems(date) {
        date = date.replace(' ', 'T');
        let response;
        try {
            response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/mxitem?lean=1&oslc.where=in22>"${date}" and itemnum="9%25"&oslc.select=itemnum,in22,description,issueunit,commoditygroup,externalrefid,status`, {
                headers: {
                    "apikey": this.login.userid,
                }});
        } catch (err) {
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
            return false;
        }
        let content = await response.json();
        let items = [];
        let previousDate = [new Date("2000-01-01"), ''];
        let newDate = '';
        if (content["Error"]) { //content["Error"]["message"]
            postMessage(['warning', content["Error"]]);
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            content["member"].forEach(item => {
                newDate = item["in22"].replace("T", " ").slice(0, -6);
                items.push([
                    item["itemnum"],
                    item["description"],
                    newDate,
                    item["externalrefid"],
                    item["issueunit"],
                    item["commoditygroup"],
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
            response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/IKO_COMPMASTER?lean=1&oslc.where=type="M" and changedate>"${date}"&oslc.select=company,name,homepage,changedate`, {
                headers: {
                    "apikey": this.login.userid,
                }});
        } catch (err) {
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
            return false;
        }
        let content = await response.json();
        let items = [];
        let previousDate = [new Date("2000-01-01"), ''];
        let newDate = '';
        if (content["Error"]) { //content["Error"]["message"]
            postMessage(['warning', content["Error"]["message"] ?? content["Error"]]);
            postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            content["member"].forEach(item => {
                newDate = item["changedate"].replace("T", " ").slice(0, -6);
                items.push([
                    item["company"],
                    newDate,
                    item["name"],
                    item["homepage"],
                ]);
                if (previousDate[0] < new Date(newDate)) {
                    previousDate = [new Date(newDate), newDate];
                }
            });
            return [items, previousDate[1]];
        }
    }

    async getCurItemNumber(numSeries) {
        let response;
        try {
            // get latest 91* number (will need to be updated to 92 after 200k items have been created in Maximo)
            // %25 is %
            response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/mxitem?lean=1&oslc.where=status="active" and itemnum="${numSeries}%25"&_lid=${this.login.userid}&_lpwd=${this.login.password}&oslc.select=itemnum&oslc.pageSize=1&oslc.orderBy=-itemnum`, {
                headers: {
                    "apikey": this.login.userid,
                }});

        } catch (err) {
            postMessage(['debug', 'Failed to fetch data from Maximo, please check network (1)']);
            throw new Error('Failed to fetch data from Maximo, please check network (1)');
        }
        let content = await response.json();
        if (content["Error"]) { //content["Error"]["message"]
            postMessage(['debug', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
            throw new Error('Failed to fetch data from Maximo, please check network (2)');
        } else {
            try {
                let number = content["member"][0]['itemnum'];
                number = parseInt(number);
                return number;
            } catch {
                throw new Error('Invalid number series');
            }

        }
    }

    async checkLogin(userid = this.login.userid, password = this.login.password) {
        let response;
        try {
            response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/whoami?lean=1`, {
                headers: {
                    "apikey": userid,
                },
            });
        } catch (err) {
            postMessage(['result', 1, 'Failed to fetch Data from Maximo, Please Check Network (1)']);
            return false;
        }
        let content = await response.json();
        if (content["Error"]) {
            postMessage(['result', 1, 'Failed to login to Maximo, Please Check User Name & Password']);
            postMessage(['result', 1, content["Error"]["message"]]);
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

    async uploadToMaximo(item){
        let xmldoc =     
    `<?xml version="1.0" encoding="UTF-8"?>
    <SyncIKO_ITEMMASTER xmlns="http://www.ibm.com/maximo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <IKO_ITEMMASTERSet>
        <ITEM>
            <COMMODITYGROUP>${item.commoditygroup}</COMMODITYGROUP>
            <DESCRIPTION>${item.description.replaceAll('&','&amp;')}</DESCRIPTION>
            <DESCRIPTION_LONGDESCRIPTION>${item.longdescription.replaceAll('&','&amp;')}</DESCRIPTION_LONGDESCRIPTION>
            <EXTERNALREFID>${item.glclass}</EXTERNALREFID>
            <IKO_ASSETPREFIX>${item.assetprefix}</IKO_ASSETPREFIX>
            <IKO_ASSETSEED>${item.assetseed}</IKO_ASSETSEED>
            <IKO_JPNUM>${item.jpnum}</IKO_JPNUM>
            <INSPECTIONREQUIRED>${item.inspectionrequired}</INSPECTIONREQUIRED>
            <ISIMPORT>${item.isimport}</ISIMPORT>
            <ISSUEUNIT>${item.issueunit}</ISSUEUNIT>
            <ITEMNUM>${item.itemnumber}</ITEMNUM>
            <ITEMSETID>ITEMSET1</ITEMSETID>
            <ROTATING>${item.rotating}</ROTATING>
            <STATUS>ACTIVE</STATUS>
        </ITEM>
    </IKO_ITEMMASTERSet>
    </SyncIKO_ITEMMASTER>`;
    
        let response = await fetch('https://test.manage.test.iko.max-it-eam.com/maximo/api/os/IKO_ITEMMASTER?action=importfile', {
            method: "POST",
            headers: {
                "filetype":"XML",
                "apikey": this.login.userid,
                //"preview": "1"
            },
            body: xmldoc,
        });
        let content = await response.json();
        //console.log(content);
        return parseInt(content.validdoc);
    }

    async uploadImageToMaximo(image){
        //check valid image type
        if(image.type !== "image/jpeg" && image.type !== "image/png"){
            return ['fail', 'Image type not jpeg or png'];
        }

        //check valid item number        
        let itemnum = image.name.slice(0,7);
        let response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/mxitem?oslc.where=itemnum=${itemnum}`, {
            method: "GET",
            headers: {
                "apikey": this.login.userid,
            }
        })
        let content = await response.json();
        if(content["rdfs:member"] == 0 || content['oslc:Error']){
            return ['fail', 'Item number not found'];
        }

        //get item id
        let itemId = content["rdfs:member"][0]["rdf:resource"];
        itemId = itemId.slice(38);
        //console.log("item id " + itemId);

        //check for existing image
        response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}`,{
            method: "GET",
            headers: {
                "apikey": this.login.userid,
            }
        })
        content = await response.json();

        //if image exists
        if(content["_imagelibref"]){
            //console.log("image exists");

            //code to delete existing image
            /*response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}?action=system:deleteimage`, {
                method: "POST",
                headers: {
                    "x-method-override":"PATCH",
                    "apikey": this.login.userid,
                }
            });*/
            
            //dont upload image
            return ['warning', 'Image already exists for item number'];
        }

        //upload new image
        response = await fetch(`https://test.manage.test.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}?action=system:addimage`, {
            method: "POST",
            headers: {
                "x-method-override":"PATCH",
                "Slug":`${itemnum}.jpg`,
                "Content-type":"image/jpeg",
                "custom-encoding":"base",
                "apikey": this.login.userid,
            },
            body: image
        });

        //debugger;
        //console.log(response['statusText']);
        return ['success'];
    }
}

module.exports = Maximo;
