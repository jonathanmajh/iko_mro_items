const Validate = require('../assets/validators')

// class Sleep {
//     constructor(ms) {
//         const date = Date.now();
//         console.log('sleep')
//         let currentDate = null;
//         do {
//             currentDate = Date.now();
//         } while (currentDate - date < ms);
//         console.log('woke')
//     }
// }

onmessage = function (e) {
    console.log('recieved message from boss:')
    console.log(e);
    if (e.data[0] === 'validSingle') {
        console.log(e.data[1]);
        let valid = new Validate;
        let result = valid.validateSingle(e.data[1]);
        console.log(result);
        postMessage(result);
        postMessage('test message');
    } else {
        console.log('unimplimented work');
    }
}
    // if (e.data[0] === 'progress') {
    //     postMessage(e.data.slice(1,))
    // } else {
    //     new Sleep(5000);
    //     const excel = new ExcelReader();
    //     let data = excel.getManufactures();
    //     console.log(data);
    //     console.log('work is done, sending...');
    //     postMessage(data);
    // }

console.log('worker thread started')