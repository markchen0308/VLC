
//import ModbusRTU from 'modbus-serial';
//let 
import * as util from 'util';
import * as CP from 'child_process';
let ModbusSer = require('modbus-serial');

export class ModbusRTU {
    exec = util.promisify(CP.exec);
    public timeout: number = 20;
    public rs485DeviceName: string = 'ttyUSB0';
    public devicePath: string = '/dev/' + this.rs485DeviceName;
    public baudrate: number =3000000;//baudrate =3m;
    public modbus_Master = new ModbusSer();

    public regStartAddress: number;
    public registerNum: number;
    public writeValue: number[];
    isDeviceOk: boolean = false;

    constructor() {
        // this.testProcess();

        // this.process();
    }

    async process(): Promise<boolean> {
       
        let rx = await this.checkRS485Device();
        if (rx) {
            this.delay(5000);
            //set Baudrate
            this.modbus_Master.connectRTU(this.devicePath, { baudRate: this.baudrate })
            //set limitation of response time
            this.modbus_Master.setTimeout(this.timeout);
            console.log(this.rs485DeviceName + ' is exist!');
           
        }
        else {
            console.log(this.rs485DeviceName + ' is not exist!');
        }

        return new Promise<boolean>((resolve, reject) => {
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
    async checkRS485Device(): Promise<boolean> {

        let rx = await this.exec('ls /dev/ | grep ' + this.rs485DeviceName);
        if (rx.stdout.includes(this.rs485DeviceName)) {
            this.isDeviceOk = true;
            rx = await this.exec('chmod +x ' + this.devicePath);//set  executable
        }
        else {
            this.isDeviceOk = false;
        }

        return new Promise<boolean>((resolve, reject) => {
            if (this.isDeviceOk) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }
    //----------------------------------------------------------------
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
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
    setSlaveID(id: number) {
        this.modbus_Master.setID(id);
    }
//----------------------------------------------------------------
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
                    reject(e.message);
                });
        });
    }
//----------------------------------------------------------------
    //FC3
    readHoldingRegisters(startAddress: number, regNum: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
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
    readInputRegisters(startAddress: number, regNum: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.modbus_Master.readInputRegisters(startAddress, regNum)
                .then((d) => {
                   // console.log("received InputRegister", d.data);
                    resolve(d.data);
                })
                .catch((e) => {
                    reject(e.message)
                });
        });
    }
//----------------------------------------------------------------
    //FC6
    writeSingleRegister(startAddress: number, regValue: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.modbus_Master.writeRegister(startAddress, regValue)
                .then((d) => {
                //    console.log("Write Holding Register", d)
                    resolve(d);
                })
                .catch((e) => {
                    console.log(e.message);
                    reject(e.message);
                })
        });
    }
//----------------------------------------------------------------
    //FC16 
    writeRegisters(startAddress: number, regValues: number[]): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {

            this.modbus_Master.writeRegisters(startAddress, regValues)
                .then((d) => {
                    console.log("Write Holding Registers", d);
                    resolve(d);
                })
                .catch((e) => {
                    reject(e.message);
                })
        });
    }
//----------------------------------------------------------------
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
//----------------------------------------------------------------

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
//----------------------------------------------------------------




