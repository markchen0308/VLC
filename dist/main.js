"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modbusProtocol_1 = require("./modbusProtocol");
//let oscntl:OSControl=new OSControl();
//let processContol:PROCESSES=new PROCESSES();//start processes
//let masterRs485:ModbusRTU=new ModbusRTU();
let proModbus = new modbusProtocol_1.ProModbus();
//let numtest:Uint8Array=Uint8Array.from([0xFF,0xFE]);
function byte2Number2s(hbyte, lbyte) {
    let i16 = new Int16Array(1);
    i16[0] = 0x10000 - 0xFFFE;
    let num = i16[0];
    return num;
}
//console.log(byte2Number2s(numtest,numtest))
//# sourceMappingURL=main.js.map