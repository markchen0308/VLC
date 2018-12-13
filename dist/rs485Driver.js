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
        this.setSlave(this.slaveID, this.timeout);
        // this.readInputRegisters(this.regStartAddress,3);
        this.testProcess();
    }
    testProcess() {
        /*
        //FC3
        this.regStartAddress = 0x01;
        this.registerNum=3;
        setTimeout(()=>{
            this.readHoldingRegisters(this.regStartAddress,this.registerNum);
        },1000);


        //FC4
        this.regStartAddress = 0x1;
        this.registerNum=3;
        setTimeout(()=>{
            this.readInputRegisters(this.regStartAddress,this.registerNum=3);
        },2000);

         //FC6
        this.regStartAddress = 0x01;
        
        setTimeout(()=>{
            this.writeSingleRegister(this.regStartAddress,0x3E8);
        },3000);

      */
        //FC16
        this.regStartAddress = 0x1;
        setTimeout(() => {
            this.writeRegisters(this.regStartAddress, [0x164, 0x165, 0x166]);
        }, 1000);
    }
    setSlave(id, timeout) {
        this.modbus_Master.setID(id);
        this.modbus_Master.setTimeout(timeout);
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
            console.log("received", d.data);
        });
    }
    //FC4
    readInputRegisters(startAddress, regNum) {
        this.modbus_Master.readInputRegisters(startAddress, regNum)
            .then((d) => {
            console.log("received", d.data);
        });
    }
    //FC6
    writeSingleRegister(startAddress, regValue) {
        this.modbus_Master.writeRegister(startAddress, regValue)
            .then((d) => {
            console.log("write Register", d);
        })
            .catch((e) => {
            console.log(e.message);
        });
    }
    //FC16 
    writeRegisters(startAddress, regValues) {
        this.modbus_Master.writeRegisters(startAddress, regValues)
            .then((d) => {
            console.log("write Registers", d);
        })
            .catch((e) => {
            console.log(e.message);
        });
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
//# sourceMappingURL=rs485Driver.js.map