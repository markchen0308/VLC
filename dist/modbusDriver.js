"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import ModbusRTU from 'modbus-serial';
//let 
let ModbusRTU = require('modbus-serial');
class RS485DRIVER {
    constructor() {
        this.timeout = 500;
        this.deviceName = '/dev/ttyUSB0';
        this.baudrate = 115200;
        this.modbus_Master = new ModbusRTU();
        this.slaveID = 3;
        this.modbus_Master.connectRTU(this.deviceName, { baudRate: this.baudrate });
        //this.modbus_client.connectRTUBuffered(this.deviceName,{baudRate:this.baudrate});
        this.modbus_Master.setTimeout(this.timeout);
        this.setSlave(this.slaveID);
        this.testProcess();
    }
    testProcess() {
        //this.writeReadHoldingRegister();
        //this.writeReadHoldingRegisters();
        this.readInputRegister();
    }
    setSlave(id) {
        this.modbus_Master.setID(id);
    }
    //FC1
    readCoilStatus(startAddress, readStatusNumber) {
        this.modbus_Master.readCoils(startAddress, readStatusNumber)
            .then((d) => {
            console.log("Received Coil data:", d.data);
        })
            .catch((e) => {
            console.log(e.message);
        });
    }
    //FC3
    readHoldingRegisters(startAddress, regNum) {
        this.modbus_Master.readHoldingRegisters(startAddress, regNum)
            .then((d) => {
            console.log("received HoldingRegister", d.data);
        })
            .catch((e) => {
            console.log(e.message);
        });
    }
    //FC4
    readInputRegisters(startAddress, regNum) {
        this.modbus_Master.readInputRegisters(startAddress, regNum)
            .then((d) => {
            console.log("Received InputRegister", d.data);
        })
            .catch((e) => {
            console.log(e.message);
        });
    }
    //FC6
    writeSingleRegister(startAddress, regValue) {
        this.modbus_Master.writeRegister(startAddress, regValue)
            .then((d) => {
            console.log("Write Holding Register", d);
        })
            .catch((e) => {
            console.log(e.message);
        });
    }
    //FC16 
    writeRegisters(startAddress, regValues) {
        this.modbus_Master.writeRegisters(startAddress, regValues)
            .then((d) => {
            console.log("Write Holding Registers", d);
        })
            .catch((e) => {
            console.log(e.message);
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
exports.RS485DRIVER = RS485DRIVER;
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