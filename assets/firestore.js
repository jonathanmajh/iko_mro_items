
const {initializeApp} = require('firebase/app');
const {getFirestore, collection, addDoc} = require('firebase/firestore/lite');
const CONSTANTS = require('../assets/constants.js');

/**
 * For Firestore app usage tracking
 */
class Firestore {
  #fireApp;
  #fireDB;

  /**
   * login to firestore
   */
  constructor(){
    this.#fireApp = initializeApp(CONSTANTS.FIREBASECONFIG);
    this.#fireDB = getFirestore(this.#fireApp);
  }


  /**
   * Add data to fireStore
   * userid + date is included by default
   * @param {data} data Data dictionary to be included
   */
  async log(data) {
    if (this.#fireDB == undefined){
      console.log("firestore is not initialized");
      return;
    }
    const fireRef = await addDoc(collection(this.#fireDB, 'events'), {
      time: Date.now(), user: process.env.USERNAME, ...data,
    });
    console.log("added: " + fireRef.id);
  }
}

module.exports = {
  Firestore
};