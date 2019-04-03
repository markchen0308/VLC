"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import ModbusRTU from 'modbus-serial';
//let 
const util = require("util");
const CP = require("child_process");
let ModbusSer = require('modbus-serial');
class ModbusRTU {
    constructor() {
        // this.testProcess();
        this.exec = util.promisify(CP.exec);
        this.timeout = 20;
        this.rs485DeviceName = 'ttyUSB0';
        this.devicePath = '/dev/' + this.rs485DeviceName;
        this.baudrate = 3000000; //baudrate =3m;
        this.modbus_Master = new ModbusSer();
        this.isDeviceOk = false;
        // this.process();
    }
    async process() {
        let rx = await this.checkRS485Device();
        if (rx) {
            this.delay(5000);
            //set Baudrate
            this.modbus_Master.connectRTU(this.devicePath, { baudRate: this.baudrate });
            //set limitation of response time
            this.modbus_Master.setTimeout(this.timeout);
            console.log(this.rs485DeviceName + ' is exist!');
        }
        else {
            console.log(this.rs485DeviceName + ' is not exist!');
        }
        return new Promise((resolve, reject) => {
            if (rx) {
                console.log("return true");
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }
    //----------------------------------------------------------------
    async checkRS485Device() {
        let rx = await this.exec('ls /dev/ | grep ' + this.rs485DeviceName);
        if (rx.stdout.includes(this.rs485DeviceName)) {
            this.isDeviceOk = true;
            rx = await this.exec('chmod +x ' + this.devicePath); //set  executable
        }
        else {
            this.isDeviceOk = false;
        }
        return new Promise((resolve, reject) => {
            if (this.isDeviceOk) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }
    //----------------------------------------------------------------
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
    //----------------------------------------------------------------
    async testProcess() {
        //this.writeReadHoldingRegister();
        //this.writeReadHoldingRegisters();
        //this.readInputRegister();
        await this.delay(1000);
        this.setSlaveID(7);
        await this.readHoldingRegisters(0, 6)
            .then((d) => {
            console.log(d);
        })
            .catch((errorMsg) => {
            console.log(errorMsg);
        });
    }
    //----------------------------------------------------------------
    setSlaveID(id) {
        this.modbus_Master.setID(id);
    }
    //----------------------------------------------------------------
    //FC1
    readCoilStatus(startAddress, readStatusNumber) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.readCoils(startAddress, readStatusNumber)
                .then((d) => {
                console.log("Received Coil data:", d.data);
                resolve(d.data);
            })
                .catch((e) => {
                console.log(e.message);
                reject(e.message);
            });
        });
    }
    //----------------------------------------------------------------
    //FC3
    readHoldingRegisters(startAddress, regNum) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.readHoldingRegisters(startAddress, regNum)
                .then((d) => {
                //     console.log("received HoldingRegister", d.data);
                resolve(d.data);
            })
                .catch((e) => {
                console.log(e.message);
                reject(e.message);
            });
        });
    }
    //----------------------------------------------------------------
    //FC4
    readInputRegisters(startAddress, regNum) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.readInputRegisters(startAddress, regNum)
                .then((d) => {
                // console.log("received InputRegister", d.data);
                resolve(d.data);
            })
                .catch((e) => {
                reject(e.message);
            });
        });
    }
    //----------------------------------------------------------------
    //FC6
    writeSingleRegister(startAddress, regValue) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.writeRegister(startAddress, regValue)
                .then((d) => {
                //    console.log("Write Holding Register", d)
                resolve(d);
            })
                .catch((e) => {
                console.log(e.message);
                reject(e.message);
            });
        });
    }
    //----------------------------------------------------------------
    //FC16 
    writeRegisters(startAddress, regValues) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.writeRegisters(startAddress, regValues)
                .then((d) => {
                console.log("Write Holding Registers", d);
                resolve(d);
            })
                .catch((e) => {
                reject(e.message);
            });
        });
    }
    //----------------------------------------------------------------
    writeReadHoldingRegister() {
        //FC6
        this.regStartAddress = 0x01;
        this.registerNum = 1;
        let writeDataByte = 6789;
        setTimeout(() => {
            this.writeSingleRegister(this.regStartAddress, writeDataByte);
        }, 1000);
        //FC3
        setTimeout(() => {
            this.readHoldingRegisters(this.regStartAddress, this.registerNum);
        }, 2000);
    }
    //----------------------------------------------------------------
    writeReadHoldingRegisters() {
        //FC16
        this.regStartAddress = 0x00;
        this.registerNum = 3;
        let writeDataBytes = [1234, 5678, 9012];
        setTimeout(() => {
            this.writeRegisters(this.regStartAddress, writeDataBytes);
        }, 1000);
        //FC3
        setTimeout(() => {
            this.readHoldingRegisters(this.regStartAddress, this.registerNum);
        }, 2000);
    }
    //----------------------------------------------------------------
    readInputRegister() {
        //FC4 
        this.regStartAddress = 0x01;
        this.registerNum = 6;
        setTimeout(() => {
            this.readInputRegisters(this.regStartAddress, this.registerNum);
        }, 1000);
    }
}
exports.ModbusRTU = ModbusRTU;
//----------------------------------------------------------------
//# sourceMappingURL=modbusDriver.js.map