// for global constants. used for debugging


const devMode = true; //set to true for testing. Remember to set it back to false when committing!


const CONSTANTS = Object.freeze({
  /** 
   * set true to open dev tools on application launch
   */
  OPEN_DEV_TOOLS: devMode,
  /**
   * set false to use production environment and set true for test environments.
   */
  ENV: devMode ? 'test.manage.test' : 'prod.manage.prod',
  /**
   * replacement characters for various invalid unicode characters. For item search
   */
  REPLACEMENTS: Object.freeze({
    // single quote
    '`': '\'',
    '´': '\'',
    '‘': '\'',
    '’': '\'',
    // double quote
    '“': '"',
    '”': '"',
    // hyphen
    '—': '-',
    '–': '-',
    '−': '-',
  }),
  /**
   * FireBase/FireStore user info
   */
  FIREBASECONFIG: Object.freeze({
    apiKey: 'AIzaSyArfJMEQvf1K2HEhlBixj-6CA_DqNC04bs',
    authDomain: 'iko-reliability.firebaseapp.com',
    projectId: 'iko-reliability',
    storageBucket: 'iko-reliability.appspot.com',
    messagingSenderId: '36956740284',
    appId: '1:36956740284:web:561e9a73a0f3f4b08fceb9',
    measurementId: 'G-112KCDJT5G',
  }),
  /**
   * string representing the launch app event. For FireStore
   * @type {'Start App'}
   */
  FIRESTORE_EVENT_STARTAPP: 'Start App',
  /**
   * string representing the searching item event. For FireStore
   * @type {'Search Item'}
   */
  FIRESTORE_EVENT_SEARCH: 'Search Item',
  /**
   * string representing the adding item to storeroom/inventory event. For FireStore
   * @type {'Add to Inventory'}
   */
  FIRESTORE_EVENT_ADDTOINVENTORY: 'Add to Inventory',
  /**
   * string representing the requesting new item to corporate event. For FireStore
   * @type {'Request Item'}
   */
  FIRESTORE_EVENT_REQUESTITEM: 'Request Item',
  /**
   * nested object of sites and storerooms (codes). Listed as orgid -> site -> storeroom -> storeroom string
   * i.e. to get the string for AAG storeroom, call is CONSTANTS.SITES["IKO-CAD"].AA.AAG or CONSTANTS.SITES["IKO-CAD"]["AA"]["AAG"]
   */
  SITES: ((obj) => { // use anonymous function so IntelliSense works
      Object.keys(obj).forEach((property) => {
        if(typeof obj[property] === "object" && !Object.isFrozen(obj[property])){
        Object.freeze(obj[property]);
      }
      });
      return Object.freeze(obj);}) ({ // Add more sites and storerooms as needed...
    "IKO-CAD": {
      AA: {
        AAG:'AAG: Brampton B2 Storeroom',
        AAL:'AAL: Brampton B2/B4 Maintenance Storeroom',
        AAO:'AAO: Brampton B4 Oxidizer Storeroom',
      },
      BA: { BAL:'BAL: IKO Calgary Maintenance Storeroom'},
      GE: { GEL: 'GEL: Ashcroft Maintenance Storeroom'},
      GH: { GHL: 'GHL: IKO Hawkesbury Maintenance Storeroom'},
      GI: { GIL: 'GIL: IKO Madoc Maintenance Storeroom'},
      GJ: { GJL: 'GJL: CRC Toronto Maintenance Storeroom'},
      GK: {
        GKA: 'GKA: IG Brampton B7 and B8 Storeroom',
        GKC: 'GKC: IG Brampton B6 and Laminator Storeroom',
        GKL: 'GKL: IG Brampton Maintenance Storeroom',
      },
      GM: { GML: 'GML: IG High River Maintenance Storeroom'},
      GP: { GPL: 'GPL: CRC Brampton Maintenance Storeroom'},
      GR: { GRL: 'GRL: Bramcal Maintenance Storeroom'},
      GX: { GXL: 'GXL: Maxi-Mix Maintenance Storeroom'},
    },
    "IKO-US": {
      BL: {
        BLC:'BLC: Hagerstown TPO Storeroom',
        BLD:'BLD: Hagerstown ISO Storeroom',
        BLL:'BLL: Hagerstown Maintenance Storeroom(Shared)',
      },
      CA: {CAL: 'CAL: IKO Kankakee Maintenance Storeroom'},
      GC: {
        GCL: 'GCL: Sumas Maintenance Storeroom',
        GCA: 'GCA: Sumas Shipping Storeroom',
        GCD: 'GCD: Sumas Shingle Storeroom',
        GCG: 'GCG: Sumas Mod Line Storeroom',
        GCJ: 'GCJ: Sumas Crusher Storeroom',
        GCK: 'GCK: Sumas Tank Farm Storeroom',
      },
      GS: { GSL: 'GSL: Sylacauga Maintenance Storeroom'},
      GV: { GVL: 'GVL: IKO Hillsboro Maintenance Storeroom'},
    },
    "IKO-EU": {
      ANT: {
        AN1:'AN1: Antwerp Mod Line Storeroom', 
        AN2:'AN2: Antwerp Coating Line Storeroom'
      },
      COM: {CB1: 'CB1: Combronde Maintenance Storeroom'},
      KLU: {
        KD1: 'KD1: IKO Klundert Maintenance Storeroom',
        KD2: 'KD2: IKO Klundert Lab Storeroom',
        KD3: 'KD3: IKO Klundert Logistics Storeroom',
      },
      PBM: { PB6: 'PB6: Slovakia Maintenance Storeroom'},
    },
    "IKO-UK": {
      CAM: {C61:'C61: IKO Appley Bridge Maintenance Storeroom'},
      RAM: { RA6: 'RA6: IKO Alconbury Maintenance Storeroom'},
    }
  }),
  /**
   * Finds the site/plant code for a given storeroom
   * @param {String} storeroom - storeroom code to find the site of
   * @returns {String} code of the site/plant, returns empty string if invalid storeroom code 
  */
  findSiteOfStoreroom: (storeroom) => {
    const code = storeroom.toUpperCase();
    for(const org of Object.keys(CONSTANTS.SITES)) {
      for(const site of Object.keys(CONSTANTS.SITES[org])){
        for(const storeroom of Object.keys(CONSTANTS.SITES[org][site])){
          if(storeroom === code) {
            return site;
          }
        }
      }
    }
    return '';
  },
  /**
   * Gets all site codes listed in CONSTANTS.SITES or a given IKO organization
   * @param {''|"IKO-CAD"|"IKO-US"|"IKO-UK"|"IKO-EU"} [orgId = ''] - the organization id. Leave it blank to get sites from all organizations
   * @returns {string[]} array of the site codes 
   */
  getAllSites: (orgId = '') => {
    if(!orgId) { //if no orgId given
      let sites = [];
      Object.keys(CONSTANTS.SITES).forEach((orgid) => {
        sites = sites.concat(Object.keys(CONSTANTS.SITES[orgid]));
      });
      return sites;
    } else if (CONSTANTS.SITES[orgId]) { //if valid orgId
      return Object.keys(CONSTANTS.SITES[orgId]);
    } else { //not valid orgId
      console.error(`"${orgId}" is not a valid organization id`)
      return [];
    }
  },
  /**
   * Gets all storeroom codes for all or a single site
   * @param {string} [site = ''] - id of the site. Leave it blank to get the storerooms for all sites 
   * @returns {string[]} array of the storeroom codes
   */
  getAllStorerooms: (site = '') => {
    if (!site) { //if no site given
      let storerooms = [];
      Object.keys(CONSTANTS.SITES).forEach((orgid) => {
        Object.keys(CONSTANTS.SITES[orgid]).forEach((siteid) => {
          storerooms = storerooms.concat(Object.keys(CONSTANTS.SITES[orgid][siteid]));
        });
      });
      return storerooms;
    }
    let orgid = CONSTANTS.findSiteOfStoreroom(site);
    if (CONSTANTS.SITES[orgid] && CONSTANTS.SITES[orgid][site]) { //if site exists
      return Object.keys(CONSTANTS.SITES[orgid][site]);
    } else {
      console.error(`"${site}" is not a valid site id`);
      return [];
    }
  },
  /**
   * Finds the storeroom string) for a storeroom code
   * @param {String} code - three character storeroom code 
   * @returns {String} detailed storeroom string, empty string if invalid storeroom code 
   */
  getStoreroomStrFromCode: (code) => {
    const upperStr = code.toUpperCase();
    for(const orgid of Object.keys(CONSTANTS.SITES)) {
      for(const site of Object.keys(CONSTANTS.SITES[orgid])){
        for(const storeroom of Object.keys(CONSTANTS.SITES[orgid][site])){
          if(storeroom === upperStr){
            return CONSTANTS.SITES[orgid][site][storeroom];
          }
        }
      }
    }
    console.error(`${code} is not a valid storeroom code`);
    return '';
  },
});

module.exports = CONSTANTS;
