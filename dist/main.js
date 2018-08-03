"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CP = require("child_process");
//let CP=require('child_process');
let cp_database = CP.fork('./child_database.js'); //fork a sub process
cp_database.on('message', (msg) => {
    console.log('get data from child' + msg);
});
setTimeout(() => {
    cp_database.send('msg from main');
}, 1000);
