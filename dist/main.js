"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CP = require("child_process");
//let CP=require('child_process');
let cp_database = CP.fork('./child_database.js'); //fork a sub process
let cp_webserver = CP.fork('./child_webserver.js'); //fork a sub process
let cp_rs485 = CP.fork('./child_rs485.js'); //fork a sub process
cp_database.on('message', (msg) => {
    console.log('main get data from ' + msg);
});
cp_webserver.on('message', (msg) => {
    console.log('main get data from ' + msg);
});
cp_rs485.on('message', (msg) => {
    console.log('main get data from ' + msg);
});
setTimeout(() => {
    cp_database.send('main');
    cp_webserver.send('main');
    cp_rs485.send('main');
}, 1000);
