"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
PS.on('message', (msg) => {
    console.log('child database get data from parent:' + msg);
});
PS.send('yes');
