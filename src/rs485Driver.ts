
//import ModbusRTU from 'modbus-serial';
//let 
let ModbusRTU=require('modbus-serial');

export class RS485DRIVER {
    public timeout: number = 500;
    public deviceName: string = '/dev/ttyUSB0';
    public baudrate: number = 115200;
    public modbus_Master=new ModbusRTU();

    public slaveID: number = 3;
    public regStartAddress: number;
   
    constructor() {
       
        this.modbus_Master.connectRTU(this.deviceName, { baudRate: this.baudrate })
        //this.modbus_client.connectRTUBuffered(this.deviceName,{baudRate:this.baudrate});
        this.setSlave(this.slaveID, this.timeout)
        this.regStartAddress = 0x01;
       // this.readInputRegisters(this.regStartAddress,3);
       this.testProcess();
    }

    testProcess()
    {
        //FC3
        setTimeout(()=>{
            this.readHoldingRegisters(this.regStartAddress,3);
        },1000);
/*
        //FC4
        setTimeout(()=>{
            this.readInputRegisters(this.regStartAddress,3);
        },2000);

         //FC6
        setTimeout(()=>{
            this.writeSingleRegister(this.regStartAddress,0x3456);
        },3000);
        
        //FC16
        setTimeout(()=>{
            this.writeRegisters(this.regStartAddress,[0x1111, 0x2222, 0x3333]);
        },4000);
  */      
    }

    setSlave(id: number, timeout: number) {
        this.modbus_Master.setID(id);
        this.modbus_Master.setTimeout(timeout);
    }

    //FC1
    readCoilStatus(startAddress: number, readStatusNumber: number) {
        this.modbus_Master.readCoils(startAddress, readStatusNumber)
            .then((d) => {
                console.log("Received Coil data:", d.data);
            })
            .catch((e) => {
                console.log(e.message)
            })
    }


    //FC3
    readHoldingRegisters(startAddress: number, regNum: number) {
        this.modbus_Master.readHoldingRegisters(startAddress, regNum)
            .then((d) => {
                console.log("received", d.data);
            });
    }

    //FC4
    readInputRegisters(startAddress: number, regNum: number) {
        this.modbus_Master.readInputRegisters(startAddress, regNum)
            .then((d) => {
                console.log("received", d.data);
            });
    }

    //FC6
    writeSingleRegister(startAddress:number,regValue:number)
    {
        this.modbus_Master.writeRegister(startAddress,regValue)
        .then((d)=>{
            console.log("write Register",d)
        })
        .catch((e)=>
        {
            console.log(e.message);
        })
    } 

    //FC16 
    writeRegisters(startAddress: number, regValues: number[]) {
        this.modbus_Master.writeRegisters(startAddress, regValues)
            .then((d) => {
                console.log("write Registers", d)
            })
            .catch((e) => {
                console.log(e.message);
            })
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