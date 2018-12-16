
//import ModbusRTU from 'modbus-serial';
//let 
let ModbusSer = require('modbus-serial');

export class ModbusRTU {
    public timeout: number = 100;
    public deviceName: string = '/dev/ttyUSB0';
    public baudrate: number = 115200;
    public modbus_Master = new ModbusSer();

    public regStartAddress: number;
    public registerNum: number;
    public writeValue: number[];

    constructor() {
        //set Baudrate
        this.modbus_Master.connectRTU(this.deviceName, { baudRate: this.baudrate })
        //set limitation of response time
        this.modbus_Master.setTimeout(this.timeout);

        //this.modbus_client.connectRTUBuffered(this.deviceName,{baudRate:this.baudrate});
        //this.setSlave(this.slaveID);
        // this.testProcess();
    }



    testProcess() {
        //this.writeReadHoldingRegister();
        //this.writeReadHoldingRegisters();
        this.readInputRegister();
    }

    setSlave(id: number) {
        this.modbus_Master.setID(id);
    }

    //FC1
    readCoilStatus(startAddress: number, readStatusNumber: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.modbus_Master.readCoils(startAddress, readStatusNumber)
                .then((d) => {
                    console.log("Received Coil data:", d.data);
                    resolve(d.data);
                })
                .catch((e) => {
                    console.log(e.message);
                    reject([]);
                });
        });


    }


    //FC3
    readHoldingRegisters(startAddress: number, regNum: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.modbus_Master.readHoldingRegisters(startAddress, regNum)
                .then((d) => {
                    console.log("received HoldingRegister", d.data);
                    resolve(d.data);
                })
                .catch((e) => {
                    console.log(e.message);
                    reject([]);
                });
        });

    }

    //FC4
    readInputRegisters(startAddress: number, regNum: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.modbus_Master.readInputRegisters(startAddress, regNum)
                .then((d) => {
                    console.log("received InputRegister", d.data);
                    resolve(d.data);
                })
                .catch((e) => {
                    console.log(e.message);
                    reject([])
                });
        });
    }

    //FC6
    writeSingleRegister(startAddress: number, regValue: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.modbus_Master.writeRegister(startAddress, regValue)
                .then((d) => {
                    console.log("Write Holding Register", d)
                    resolve(d);
                })
                .catch((e) => {
                    console.log(e.message);
                    reject([]);
                })
        });
    }

    //FC16 
    writeRegisters(startAddress: number, regValues: number[]): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {

            this.modbus_Master.writeRegisters(startAddress, regValues)
                .then((d) => {
                    console.log("Write Holding Registers", d);
                    resolve(d);
                })
                .catch((e) => {
                    console.log(e.message);
                    reject([]);
                })
        });

    }


    writeReadHoldingRegister() {
        //FC6
        this.regStartAddress = 0x01;
        this.registerNum = 1;
        let writeDataByte: number = 6789
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
        let writeDataBytes: number[] = [1234, 5678, 9012];
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