"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
const pgControl_1 = require("./pgControl");
let pg = new pgControl_1.PgControl();
PS.on('message', (msg) => {
    console.log('database get data from ' + msg);
});
PS.send('database');
