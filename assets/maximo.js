// various functions for fetching data from maximo rest api
const SharedDatabase = require('../assets/sharedDB');
const CONSTANTS = require('../assets/constants.js');


/**
 * Class for all calls to Maximo
 */
class Maximo {
  constructor() {
    this.shareDB = new SharedDatabase();
    this.login = this.shareDB.getPassword();
  }

  async getMeters() {
    let response;
    let nextpage = true;
    let pageno = 1;
    const meters = [];
    while (nextpage) {
      try {
        response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_meter?lean=1&pageno=${pageno}&oslc.pageSize=100&oslc.select=*&oslc.where=domainid%3D%22M-%25%22`, {
          headers: {
            'apikey': this.login.userid,
          },
        });
      } catch (err) {
        postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
        return false;
      }
      const content = await response.json();
      if (content['responseInfo']['nextPage']) {
        pageno = pageno + 1;
      } else {
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
  }

  async getObservations() {
    // return meters and observations
    let response;
    let nextpage = true;
    let pageno = 1;
    const meters = [];
    const observations = [];
    while (nextpage) {
      try {
        response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_alndomain?lean=1&pageno=${pageno}&oslc.where=domainid%3D%22M-%25%22&oslc.pageSize=100&oslc.select=alndomain%2Cdomainid%2Cdescription`, {
          headers: {
            'apikey': this.login.userid,
          },
        });
      } catch (err) {
        postMessage(['error', 'Failed to fetch Data from Maximo, Please Check Network', err]);
        return false;
      }
      const content = await response.json();
      if (content['responseInfo']['nextPage']) {
        pageno = pageno + 1;
      } else {
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
        } else {
          postMessage(['warning', `Meter: ${meter['domainid']} has no observation codes`]);
        }
      });
    }
    postMessage(['result', [meters, observations]]);
  }

  /**
  * get updated inventory records from Maximo
  * @param {int} rowstamp timestamp of latest cached inventory item
  */
  async getNewInventory(rowstamp) {
    let response;
    let nextpage = true;
    let pageno = 1;
    let newRowStamp = 0;
    const inventory = [];
    while (nextpage) {
      postMessage(['debug', `Loading inventory data page: ${pageno}`]);
      try {
        response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_inventory?lean=1&oslc.select=vendor,vendor.name,manufacturer,siteid,modelnum,itemnum,catalogcode,location&fetchmodedelta=1&lastfetchts=${rowstamp}&oslc.pageSize=1000&pageno=${pageno}`, {
          headers: {
            'apikey': this.login.userid,
          },
        });
      } catch (err) {
        postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (1)', err]);
        return false;
      }
      const content = await response.json();
      if (content['responseInfo']['nextPage']) {
        pageno = pageno + 1;
      } else {
        nextpage = false;
      }
      if (content['Error']) { // content["Error"]["message"]
        postMessage(['warning', content['Error']]);
        postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (2)']);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        newRowStamp = response.headers.get('maxrowstamp');
        content['member'].forEach((item) => {
          inventory.push([
            item['itemnum'],
            item['siteid'],
            item['catalogcode'] ?? '',
            item['modelnum'] ?? '',
            item['$alias_this_attr$vendor'] ?? '',
            item['manufacturer'] ?? '',
            item['vendor']['name'] ?? '',
            item['location'] ?? '',
            newRowStamp,
          ]);
        });
      }
    }
    return [inventory, newRowStamp];
  }

  /**
  * get updated item records from Maximo
  * @param {int} date timestamp of latest cached item
  */
  async getNewItems(date) {
    date = date.replace(' ', 'T');
    let response;
    try {
      response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem?lean=1&oslc.where=in22>"${date}" and itemnum="9%25"&oslc.select=itemnum,in22,description,issueunit,commoditygroup,externalrefid,status,description_longdescription`, {
        headers: {
          'apikey': this.login.userid,
        },
      });
    } catch (err) {
      postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (6)', err]);
      return false;
    }
    const content = await response.json();
    const items = [];
    let previousDate = [new Date('2000-01-01'), ''];
    let newDate = '';
    if (content['Error']) { // content["Error"]["message"]
      postMessage(['warning', content['Error']]);
      postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (3)']);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
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
  }

  async getNewManufacturers(date) {
    date = date.replace(' ', 'T');
    let response;
    try {
      response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/IKO_COMPMASTER?lean=1&oslc.where=type="M" and changedate>"${date}"&oslc.select=company,name,homepage,changedate`, {
        headers: {
          'apikey': this.login.userid,
        },
      });
    } catch (err) {
      postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (7)', err]);
      return false;
    }
    const content = await response.json();
    const items = [];
    let previousDate = [new Date('2000-01-01'), ''];
    let newDate = '';
    if (content['Error']) { // content["Error"]["message"]
      postMessage(['warning', content['Error']['message'] ?? content['Error']]);
      postMessage(['warning', 'Failed to fetch Data from Maximo, Please Check Network (4)']);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
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
  }

  /**
       *
       * @param {string} numSeries item series (99, 98, 91)
       * @return {number} latest item number
       */
  async getCurItemNumber(numSeries) {
    let response;
    try {
      // %25 is %
      response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem?lean=1&oslc.where=status="active" and itemnum="${numSeries}%25"&_lid=${this.login.userid}&_lpwd=${this.login.password}&oslc.select=itemnum&oslc.pageSize=1&oslc.orderBy=-itemnum`, {
        headers: {
          'apikey': this.login.userid,
        },
      });
    } catch (err) {
      postMessage(['debug', 'Failed to fetch data from Maximo, please check network (8)']); // this likely doesnt work, probably remove it
      throw new Error('Failed to fetch data from Maximo, please check network (8)');
    }
    const content = await response.json();
    if (content['Error']) { // content["Error"]["message"]
      postMessage(['debug', 'Failed to fetch Data from Maximo, Please Check Network (5)']); // this likely doesnt work, probably remove it
      throw new Error('Failed to fetch data from Maximo, please check network (5)');
    } else {
      try {
        let number = content['member'][0]['itemnum'];
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
      response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/whoami?lean=1`, {
        headers: {
          'apikey': userid,
        },
      });
    } catch (err) {
      postMessage(['result', 1, 'Failed to fetch Data from Maximo, Please Check Network (9)']);
      return false;
    }
    const content = await response.json();
    if (content['Error']) {
      postMessage(['result', 1, 'Failed to login to Maximo, Please Check User Name & Password']);
      postMessage(['result', 1, content['Error']['message']]);
      return false;
    } else {
      const userSite = content['insertSite'];
      const siteID = userSite;
      const status = true;
      this.shareDB.savePassword(userid, password);
      this.login.password = password;
      this.login.userid = userid;
      postMessage(['debug', `Successfully logged in to Maximo as: ${content.displayName}`]);
      postMessage(['result', 0, 'Successfully logged in to Maximo', siteID]);
      return {siteID, status};
    }
  }

  async uploadToMaximo(item) {
    const xmldoc =
      `<?xml version="1.0" encoding="UTF-8"?>
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
    const response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/IKO_ITEMMASTER?action=importfile`, {
      method: 'POST',
      headers: {
        'filetype': 'XML',
        'apikey': this.login.userid,
        // "preview": "1"
      },
      body: xmldoc,
    });
    const content = await response.json();
    const statuscode = response.status;
    if (statuscode == 200) {
      return parseInt(content.validdoc);
    } else {
      throw new Error(parseInt(statuscode));
    }
  }

  /**
       * Upload item to inventory
       * @param {object} item information regarding item to be added to storeroom
       * @return {number} status message
       */
  async uploadToInventory(item) {
    try {
      let xmldoc =
        `{
  "issueunit": "${item.issueunit}",
  "itemnum": "${item.itemnumber}",
  "itemsetid": "ITEMSET1",
  "siteid": "${item.siteID}",
  "storeroom": "${item.storeroomname}",
  "savenow": true,
  "istool": false,`;

      if (item.vendorname.length > 0) {
        xmldoc = xmldoc + `"vendor": "${item.vendorname}",}`;
      } else {
        xmldoc = xmldoc + '}';
      }

      const storeroom = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_location?lean=1&oslc.where=location="${item.storeroomname}"&oslc.select=*`, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'apikey': this.login.userid,
          // "preview": "1"
        },
      });
      const location = await storeroom.json();

      const response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/iko_location/${location.member[0].href.split('/').slice(-1)[0]}?internalvalues=1&lean=1&action=wsmethod%3AaddAnItemToStoreroom&domainmeta=1&querylocalized=1`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'apikey': this.login.userid,
          'x-method-override': 'PATCH',
          // "preview": "1"
        },
        body: xmldoc,
      });
      const content = await response.json();
      // if upload to storeroom succeeded
      if (response.status == 200) {
        postMessage(['info', 'Item added to inventory']);
        return 1;
      } else {
        postMessage(['error', content['Error']['message']]);
      }
      return 0;
    } catch (error) {
      postMessage(['error', 'Failed to add item to inventory']);
    }
  }

  /**
       * Uploads an image to maximo
       *
       * @param {File} image
       * @returns {string[]} [status, (message if upload is unsuccessful)]
       */

  async uploadImageToMaximo(image) {
  // check valid image type
    if (image.type !== 'image/jpeg' && image.type !== 'image/png') {
      return ['fail', 'Image type not jpeg or png'];
    }

    // check if item number exists in maximo
    const itemnum = image.name.slice(0, 7); // itemnum is first 7 digits of image name
    let response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem?oslc.where=itemnum=${itemnum}`, {
      method: 'GET',
      headers: {
        'apikey': this.login.userid,
      },
    });
    let content = await response.json();
    if (content['rdfs:member'] == 0 || content['oslc:Error']) {
      return ['fail', 'Item number not found'];
    }

    // get item id - item id is a code that lets you access information about the item through the API
    let itemId = content['rdfs:member'][0]['rdf:resource'];
    itemId = itemId.slice(38);
    // console.log("item id " + itemId);

    // check for existing image
    response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}`, {
      method: 'GET',
      headers: {
        'apikey': this.login.userid,
      },
    });
    content = await response.json();

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
    response = await fetch(`https://${CONSTANTS.ENV}.iko.max-it-eam.com/maximo/api/os/mxitem/${itemId}?action=system:addimage`, {
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
  }
}

module.exports = Maximo;
