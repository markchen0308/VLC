
import  ModbusRTU from 'modbus-serial';

//const ModbusRTU=require('modbus-serial');

export class RS485DRIVER{
    public timeout:number=500;
    public deviceName: string = '/dev/ttyUSB0';
    public baudrate:number=115200;
    public modbus_client:ModbusRTU;

   
    constructor()
    {
       this.modbus_client=new ModbusRTU();
       this.modbus_client.connectRTUBuffered(this.deviceName,{baudRate:this.baudrate});
       this.modbus_client.setTimeout(500);//500ms timeout
    }

    writeModbus(id:number)
    {
        this.modbus_client.setID(id);
        
    }
}



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




/**
 * 
 */
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

    /***************************************************************
     * WriteSercom
     ***************************************************************/
    public WriteRS485(data: Buffer): void {
        this.serialport.write(data, (error: any) => {
            if (error) {
                console.log('Uart Write Error:', error.message);
            }
        });
    }

    /*************************************************************
     * ReadSercom(), read RS485 byte
     *************************************************************/
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