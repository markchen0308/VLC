"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import ModbusRTU from 'modbus-serial';
//let 
const util = require("util");
const CP = require("child_process");
let ModbusSer = require('modbus-serial');
class ModbusRTU {
    constructor() {
        this.exec = util.promisify(CP.exec);
        this.timeout = 100;
        this.rs485DeviceName = 'ttyUSB0';
        this.devicePath = '/dev/' + this.rs485DeviceName;
        this.baudrate = 3000000; //baudrate =3m;
        this.modbus_Master = new ModbusSer();
        this.isDeviceOk = false;
        // this.testProcess();
        this.process();
    }
    async process() {
        await this.checkRS485Device()
            .then((rx) => {
            //set Baudrate
            this.modbus_Master.connectRTU(this.devicePath, { baudRate: this.baudrate });
            //set limitation of response time
            this.modbus_Master.setTimeout(this.timeout);
            console.log(this.rs485DeviceName + ' is exist!');
            //this.testProcess();
        })
            .catch((rx) => {
            console.log(this.rs485DeviceName + ' is not exist!');
        });
    }
    async checkRS485Device() {
        let rx = await this.exec('ls /dev/ | grep ' + this.rs485DeviceName);
        //console.log(rx.stdout);
        if (rx.stdout.includes(this.rs485DeviceName)) {
            this.isDeviceOk = true;
            rx = await this.exec('chmod +x ' + this.devicePath); //set  executable
        }
        else {
            this.isDeviceOk = false;
        }
        return new Promise((resolve, reject) => {
            if (this.isDeviceOk) {
                resolve(this.isDeviceOk);
            }
            else {
                reject(this.isDeviceOk);
            }
        });
    }
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
    async testProcess() {
        //this.writeReadHoldingRegister();
        //this.writeReadHoldingRegisters();
        //this.readInputRegister();
        await this.delay(1000);
        this.setSlave(7);
        await this.readHoldingRegisters(0, 6)
            .then((d) => {
            console.log(d);
        })
            .catch((errorMsg) => {
            console.log(errorMsg);
        });
    }
    setSlave(id) {
        this.modbus_Master.setID(id);
    }
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
    //FC3
    readHoldingRegisters(startAddress, regNum) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.readHoldingRegisters(startAddress, regNum)
                .then((d) => {
                console.log("received HoldingRegister", d.data);
                resolve(d.data);
            })
                .catch((e) => {
                console.log(e.message);
                reject(e.message);
            });
        });
    }
    //FC4
    readInputRegisters(startAddress, regNum) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.readInputRegisters(startAddress, regNum)
                .then((d) => {
                console.log("received InputRegister", d.data);
                resolve(d.data);
            })
                .catch((e) => {
                reject(e.message);
            });
        });
    }
    //FC6
    writeSingleRegister(startAddress, regValue) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.writeRegister(startAddress, regValue)
                .then((d) => {
                console.log("Write Holding Register", d);
                resolve(d);
            })
                .catch((e) => {
                console.log(e.message);
                reject(e.message);
            });
        });
    }
    //FC16 
    writeRegisters(startAddress, regValues) {
        return new Promise((resolve, reject) => {
            this.modbus_Master.writeRegisters(startAddress, regValues)
                .then((d) => {
                console.log("Write Holding Registers", d);
                resolve(d);
            })
                .catch((e) => {
                console.log(e.message);
                reject(e.message);
            });
        });
    }
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
/*

import * as Serialport from 'serialport';;//import serialport module
//import {TypedEvent} from './typeEvent'

let RS485_BUFFER_LENGTH: number = 264;
let RS485_RX_BUFFER:number=240;
export class Sercom {
    public serialport: Serialport;
    public _readBufIndex: number;
    public _portName: string = '/dev/ttyUSB0';
    public _portSpeed: number = 115200;
    public flagExist: boolean = false;
    public rawBuffer: any[] = [];

    public rawBufferOk: boolean = false;


    constructor() {
        //this.initUart();

    }




    public async checkSerialPort(): Promise<any> {

        let res = await Serialport.list().then(ports => {
            //check uart list if  uart is  available
            this.flagExist = ports.filter((item) => { return item.comName == this._portName });
            if (this.flagExist = true) {
                this.serialport = new Serialport(this._portName, { baudRate: this._portSpeed });
                this.serialport.open(() => { });
                return true;
            }
            else {
                return false;
            }

        })
            .catch(err => console.log('Uart Open Error:'+err));

        return res;
    }


    public WriteRS485(data: Buffer): void {
        this.serialport.write(data, (error: any) => {
            if (error) {
                console.log('Uart Write Error:', error.message);
            }
        });
    }


    public  ReadRS485() {
        this.serialport.on('data', (data) => {
            if (this.rawBuffer.length < RS485_BUFFER_LENGTH) {
                data.forEach(element => {
                    this.rawBuffer.push(element);
                });
                if(this.rawBuffer.length >= RS485_BUFFER_LENGTH)
                {
                    this.rawBufferOk = true;
                    console.log(this.rawBuffer);
                }
            }
        });
    }
}
*/ 
//# sourceMappingURL=modbusDriver.js.map