"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
PS.on('message', (msg) => {
    console.log('RS485 get data from ' + msg);
});
PS.send('RS485');
