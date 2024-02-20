"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// various functions for fetching data from maximo rest api
const SharedDatabase = require('./sharedDB');
const CONSTANTS = require('./constants.js');
/**
 * Class for all calls to Maximo
 */
class Maximo {
    constructor() {
        this.shareDB = new SharedDatabase();
        this.login = this.shareDB.getPassword();
    }
    getMeters() {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            let nextpage = true;
            let pageno = 1;
            const meters = [];
            while (nextpage) {
                try {
                    response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_meter?lean=1&pageno=${pageno}&oslc.pageSize=100&oslc.select=*&oslc.where=domainid%3D%22M-%25%22`, {
                        headers: {
                            'apikey': this.login.userid,
                        },
                    });
                }
                catch (err) {
                    postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
                    return false;
                }
                const content = yield response.json();
                if (content['responseInfo']['nextPage']) {
                    pageno = pageno + 1;
                }
                else {
                    nextpage = false;
                }
                content['member'].forEach((meter) => {
                    meters.push({
                        list_id: meter['domainid'],
                        inspect: meter['description'].slice(0, meter['description'].length - 9),
                        metername: meter['metername'],
                    });
                });
            }
            return meters;
        });
    }
    getObservations() {
        return __awaiter(this, void 0, void 0, function* () {
            // return meters and observations
            let response;
            let nextpage = true;
            let pageno = 1;
            const meters = [];
            const observations = [];
            while (nextpage) {
                try {
                    response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_alndomain?lean=1&pageno=${pageno}&oslc.where=domainid%3D%22M-%25%22&oslc.pageSize=100&oslc.select=alndomain%2Cdomainid%2Cdescription`, {
                        headers: {
                            'apikey': this.login.userid,
                        },
                    });
                }
                catch (err) {
                    postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
                    return false;
                }
                const content = yield response.json();
                if (content['responseInfo']['nextPage']) {
                    pageno = pageno + 1;
                }
                else {
                    nextpage = false;
                }
                content['member'].forEach((meter) => {
                    meters.push({
                        list_id: meter['domainid'],
                        inspect: meter['description'],
                        search_str: `${meter['domainid']}~${meter['description']}`,
                    });
                    if (meter['alndomain']) {
                        meter['alndomain'].forEach((observation) => {
                            observations.push({
                                meter: meter['domainid'].slice(2),
                                id_value: observation['value'],
                                observation: observation['description'],
                                search_str: `${meter['domainid'].slice(2)}~${observation['value']}`,
                            });
                        });
                    }
                    else {
                        postMessage(['warning', `Meter: ${meter['domainid']} has no observation codes`]);
                    }
                });
            }
            postMessage(['result', [meters, observations]]);
        });
    }
    /**
    * get updated inventory records from Maximo
    * @param {int} rowstamp timestamp of latest cached inventory item
    */
    getNewInventory(rowstamp) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_inventory?lean=1&oslc.select=vendor,vendor.name,manufacturer,siteid,modelnum,itemnum,catalogcode,location&fetchmodedelta=1&lastfetchts=${rowstamp}`, {
                    headers: {
                        'apikey': this.login.userid,
                    },
                });
            }
            catch (err) {
                postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
                return false;
            }
            const content = yield response.json();
            const inventory = [];
            if (content['Error']) { // content["Error"]["message"]
                postMessage(['warning', content['Error']]);
                postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
                yield new Promise((resolve) => setTimeout(resolve, 5000));
            }
            else {
                const newRowStamp = response.headers.get('maxrowstamp');
                content['member'].forEach((item) => {
                    var _a, _b, _c, _d, _e, _f;
                    inventory.push([
                        item['itemnum'],
                        item['siteid'],
                        (_a = item['catalogcode']) !== null && _a !== void 0 ? _a : '',
                        (_b = item['modelnum']) !== null && _b !== void 0 ? _b : '',
                        (_c = item['$alias_this_attr$vendor']) !== null && _c !== void 0 ? _c : '',
                        (_d = item['manufacturer']) !== null && _d !== void 0 ? _d : '',
                        (_e = item['vendor']['name']) !== null && _e !== void 0 ? _e : '',
                        (_f = item['location']) !== null && _f !== void 0 ? _f : '',
                        newRowStamp,
                    ]);
                });
                return [inventory, newRowStamp];
            }
        });
    }
    /**
    * get updated item records from Maximo
    * @param {int} date timestamp of latest cached item
    */
    getNewItems(date) {
        return __awaiter(this, void 0, void 0, function* () {
            date = date.replace(' ', 'T');
            let response;
            try {
                response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem?lean=1&oslc.where=in22>"${date}" and itemnum="9%25"&oslc.select=itemnum,in22,description,issueunit,commoditygroup,externalrefid,status,description_longdescription`, {
                    headers: {
                        'apikey': this.login.userid,
                    },
                });
            }
            catch (err) {
                postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
                return false;
            }
            const content = yield response.json();
            const items = [];
            let previousDate = [new Date('2000-01-01'), ''];
            let newDate = '';
            if (content['Error']) { // content["Error"]["message"]
                postMessage(['warning', content['Error']]);
                postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
                yield new Promise((resolve) => setTimeout(resolve, 5000));
            }
            else {
                content['member'].forEach((item) => {
                    newDate = item['in22'].replace('T', ' ').slice(0, -6);
                    items.push([
                        item['itemnum'],
                        item['description'],
                        newDate,
                        item['externalrefid'],
                        item['issueunit'],
                        item['commoditygroup'],
                        item['description_longdescription'],
                    ]);
                    if (previousDate[0] < new Date(newDate)) {
                        previousDate = [new Date(newDate), newDate];
                    }
                });
                return [items, previousDate[1]];
            }
        });
    }
    getNewManufacturers(date) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            date = date.replace(' ', 'T');
            let response;
            try {
                response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/IKO_COMPMASTER?lean=1&oslc.where=type="M" and changedate>"${date}"&oslc.select=company,name,homepage,changedate`, {
                    headers: {
                        'apikey': this.login.userid,
                    },
                });
            }
            catch (err) {
                postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
                return false;
            }
            const content = yield response.json();
            const items = [];
            let previousDate = [new Date('2000-01-01'), ''];
            let newDate = '';
            if (content['Error']) { // content["Error"]["message"]
                postMessage(['warning', (_a = content['Error']['message']) !== null && _a !== void 0 ? _a : content['Error']]);
                postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
                yield new Promise((resolve) => setTimeout(resolve, 5000));
            }
            else {
                content['member'].forEach((item) => {
                    newDate = item['changedate'].replace('T', ' ').slice(0, -6);
                    items.push([
                        item['company'],
                        newDate,
                        item['name'],
                        item['homepage'],
                    ]);
                    if (previousDate[0] < new Date(newDate)) {
                        previousDate = [new Date(newDate), newDate];
                    }
                });
                return [items, previousDate[1]];
            }
        });
    }
    /**
         *
         * @param {string} numSeries item series (99, 98, 91)
         * @return {number} latest item number
         */
    getCurItemNumber(numSeries) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                // %25 is %
                response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem?lean=1&oslc.where=status="active" and itemnum="${numSeries}%25"&_lid=${this.login.userid}&_lpwd=${this.login.password}&oslc.select=itemnum&oslc.pageSize=1&oslc.orderBy=-itemnum`, {
                    headers: {
                        'apikey': this.login.userid,
                    },
                });
            }
            catch (err) {
                postMessage(['debug', 'Failed to fetch data from Maximo, please check network (1)']); // this likely doesnt work, probably remove it
                throw new Error('Failed to fetch data from Maximo, please check network (1)');
            }
            const content = yield response.json();
            if (content['Error']) { // content["Error"]["message"]
                postMessage(['debug', 'Failed to fetch Data from Maximo, Please Check Network (2)']); // this likely doesnt work, probably remove it
                throw new Error('Failed to fetch data from Maximo, please check network (2)');
            }
            else {
                try {
                    let number = content['member'][0]['itemnum'];
                    number = parseInt(number);
                    return number;
                }
                catch (_a) {
                    throw new Error('Invalid number series');
                }
            }
        });
    }
    checkLogin(userid = this.login.userid, password = this.login.password) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/whoami?lean=1`, {
                    headers: {
                        'apikey': userid,
                    },
                });
            }
            catch (err) {
                postMessage(['result', 1, 'Failed to fetch Data from Maximo, Please Check Network (1)']);
                return false;
            }
            const content = yield response.json();
            if (content['Error']) {
                postMessage(['result', 1, 'Failed to login to Maximo, Please Check User Name & Password']);
                postMessage(['result', 1, content['Error']['message']]);
                return false;
            }
            else {
                const userSite = content['insertSite'];
                const siteID = userSite;
                const status = true;
                this.shareDB.savePassword(userid, password);
                this.login.password = password;
                this.login.userid = userid;
                postMessage(['debug', `Successfully logged in to Maximo as: ${content.displayName}`]);
                postMessage(['result', 0, 'Successfully logged in to Maximo']);
                return { siteID, status };
            }
        });
    }
    uploadToMaximo(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const xmldoc = `<?xml version="1.0" encoding="UTF-8"?>
        <SyncIKO_ITEMMASTER xmlns="http://www.ibm.com/maximo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <IKO_ITEMMASTERSet>
            <ITEM>
                <COMMODITYGROUP>${item.commoditygroup}</COMMODITYGROUP>
                <DESCRIPTION>${item.description.replaceAll('&', '&amp;')}</DESCRIPTION>
                <DESCRIPTION_LONGDESCRIPTION>${item.longdescription.replaceAll('&', '&amp;')}</DESCRIPTION_LONGDESCRIPTION>
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
            const response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/IKO_ITEMMASTER?action=importfile`, {
                method: 'POST',
                headers: {
                    'filetype': 'XML',
                    'apikey': this.login.userid,
                    // "preview": "1"
                },
                body: xmldoc,
            });
            const content = yield response.json();
            const statuscode = response.status;
            if (statuscode == 200) {
                return parseInt(content.validdoc);
            }
            else {
                throw new Error(parseInt(statuscode));
            }
        });
    }
    // Uploads item to inventory
    uploadToInventory(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const xmldoc = `<?xml version="1.0" encoding="UTF-8"?>
        <SyncIKO_INVENTORY xmlns="http://www.ibm.com/maximo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <IKO_INVENTORYSet>
            <INVENTORY>
              <CATALOGCODE>${item.cataloguenum}</CATALOGCODE>
              <ISSUEUNIT>${item.issueunit}</ISSUEUNIT>
              <ITEMNUM>${item.itemnumber}</ITEMNUM>
              <ITEMSETID>ITEMSET1</ITEMSETID>
              <LOCATION>${item.storeroomname}</LOCATION>
              <SITEID>${item.siteID}</SITEID>
              <VENDOR>${item.vendorname}</VENDOR>
            </INVENTORY>
          </IKO_INVENTORYSet>
        </SyncIKO_INVENTORY>`;
            const response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/IKO_INVENTORY?action=importfile`, {
                method: 'POST',
                headers: {
                    'filetype': 'XML',
                    'apikey': this.login.userid,
                    // "preview": "1"
                },
                body: xmldoc,
            });
            const content = yield response.json();
            // if upload to storeroom succeeded
            if (parseInt(content.validdoc) == 1) {
                return 1;
            } // failure due to invalid vendor name
            else if (content['oslc:Error']['oslc:message'].includes('Company is not valid')) {
                console.log(content['oslc:Error']['oslc:message']);
                return 2;
            } // failure due to invalid site id
            else if (content['oslc:Error']['oslc:message'].includes('is not a valid site')) {
                console.log(content['oslc:Error']['oslc:message']);
                return 3;
            } // failure due to invalid storeroom
            else if (content['oslc:Error']['oslc:message'].includes('is not a valid inventory location')) {
                console.log(content['oslc:Error']['oslc:message']);
                return 4;
            } // failure due to other reason i.e. item already has inventory fields filled in on Maximo
            else {
                console.log(content['oslc:Error']['oslc:message']);
                return 0;
            }
        });
    }
    /**
         * Uploads an image to maximo
         *
         * @param {File} image
         * @returns {string[]} [status, (message if upload is unsuccessful)]
         */
    uploadImageToMaximo(image) {
        return __awaiter(this, void 0, void 0, function* () {
            // check valid image type
            if (image.type !== 'image/jpeg' && image.type !== 'image/png') {
                return ['fail', 'Image type not jpeg or png'];
            }
            // check if item number exists in maximo
            const itemnum = image.name.slice(0, 7); // itemnum is first 7 digits of image name
            let response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem?oslc.where=itemnum=${itemnum}`, {
                method: 'GET',
                headers: {
                    'apikey': this.login.userid,
                },
            });
            let content = yield response.json();
            if (content['rdfs:member'] == 0 || content['oslc:Error']) {
                return ['fail', 'Item number not found'];
            }
            // get item id - item id is a code that lets you access information about the item through the API
            let itemId = content['rdfs:member'][0]['rdf:resource'];
            itemId = itemId.slice(38);
            // console.log("item id " + itemId);
            // check for existing image
            response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}`, {
                method: 'GET',
                headers: {
                    'apikey': this.login.userid,
                },
            });
            content = yield response.json();
            // if image exists
            if (content['_imagelibref']) {
                // console.log("image exists");
                // code to delete existing image
                /* response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}?action=system:deleteimage`, {
                                method: "POST",
                                headers: {
                                    "x-method-override":"PATCH",
                                    "apikey": this.login.userid,
                                }
                            });*/
                // dont upload image
                return ['warning', 'Image already exists for item number'];
            }
            // upload new image
            response = yield fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}?action=system:addimage`, {
                method: 'POST',
                headers: {
                    'x-method-override': 'PATCH',
                    'Slug': `${itemnum}.jpg`,
                    'Content-type': 'image/jpeg',
                    'custom-encoding': 'base',
                    'apikey': this.login.userid,
                },
                body: image,
            });
            // console.log(response['statusText']);
            return ['success'];
        });
    }
}
module.exports = Maximo;
