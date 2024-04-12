//for firestore app usage logging. Doesn't work for ES6
const {initializeApp} = require('firebase/app');
const {getFirestore, collection, addDoc} = require('firebase/firestore/lite');
const { isNull } = require('lodash');
const CONSTANTS = require('../assets/constants.js');


let fireApp = null;
let fireDB = null;

/**
 * login to firestore
 * can only initialize firestore once
 */
function init() {
  if(isNull(fireDB)) {
  fireApp = initializeApp(CONSTANTS.FIREBASECONFIG);
  fireDB = getFirestore(fireApp);
  } else {
    console.log("firestore already initialized");
    return;
  }
}


/**
 * Add data to fireStore
 * userid + date is included by default
 * @param {data} data Data dictionary to be included
 */
async function fslog(data) {
  if (isNull(fireDB)){
    console.log("firestore is not initialized");
    return;
  }
  const fireRef = await addDoc(collection(fireDB, 'events'), {
    time: Date.now(), user: process.env.USERNAME, ...data,
  });
}

module.exports = {
  init,	fslog
};