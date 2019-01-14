

import * as Net from 'net';//import socket module
import * as DTCMD from './dataTypeCmd';

let fs = require('fs');
let configfilePath = './config.json';

import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevInfo, iReadableRegister, iDripstand, iDevPkg } from './dataTypeModbus';

import * as DTMODBUS from './dataTypeModbus';

import { promises, lstat } from 'fs';


enum holdingRegisterAddress {
    brightness = 0,
    ck,
    brightnessMin,
    brightnessMax,
    ckMin,
    ckMax
}

enum inputregisterAddress {
    version = 0,
    lightID,
    lightType,
    lightMacH,
    lightMacM,
    lightMacL,
    manufactureID = 6,
    countReadableRegister = 10,
    g0Device000,

}

enum typesDevice {
    tag = 1,
    dripStand,
}

enum deviceLength {
    tagLen = 24,  //bytes
    dripStandLen = 28  //bytes
}

enum devAddress {
    type = 0,
    seq = 1,
    Mac = 2,
    lId1 = 8,
    lId2 = 9,
    br1 = 10,
    br2 = 12,
    rssi = 14,
    Gx = 16,
    Gy = 17,
    Gz = 18,
    batPow = 19,
    labelX = 20,
    labelY = 21,
    labelH = 22
}

enum otherDripStandAddress {
    weight = 24,
    speed = 26
}


enum modbusCmd {
    driverInfo = 1,
    location,
}

let timeFunctionInterval: number = 5;
let maxLightIdKeep: number = 62;//max acount of light in a gw loop
let pollingTimeStep: number = 5;//polling time per light

export class ControlModbus {

    modbusClient: Net.Socket;
    modbusServerIP: string;
    modbusServerPort: number;

    masterRs485: ModbusRTU = new ModbusRTU();
    drivers: iDriver[]=[];
    devPkgMember: iDevPkg[] = [];
    pollingTime: number;

    flagServerStatus: boolean = false;
    flagModbusStatus: boolean = false;

    //-------------------------------------------------------------------------------
    constructor() {
        this.process();
    }

    async process() {
        this.startClient();//connect to server
        this.flagModbusStatus = await this.masterRs485.process();//open modbus
        // await this.delay(1000);//wait modbus ready


        if (this.flagServerStatus && this.flagModbusStatus)//server connected and modbus is ready
        {
            console.log('start modbus process');
            this.systemRun();
        }
        else {
            if (this.flagServerStatus == false) {
                console.log('Can not connect to server!');
            }

            if (this.flagModbusStatus == false) {
                console.log('RS485 device is not ready');
            }
        }
    }

    //-----------------------------------------------------------------------
    async startClient() {
        await this.readConfigFile();
        this.configureClient();
    }
    //----------------------------------------------------------------------------
    readConfigFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.modbusServerPort = configJson.scoketModbusServerPort;
            this.modbusServerIP = configJson.scoketModbusServerIP;
            resolve(true);
        });
    }

    //-------------------------------------------------------------------------------
    configureClient() {

        this.modbusClient = Net.connect(this.modbusServerPort, this.modbusServerIP, () => {
            console.log(`modbusClient connected to: ${this.modbusClient.address} :  ${this.modbusClient.localPort}`);
            this.flagServerStatus = true;
        });

        this.modbusClient.on('end', () => {
            console.log('modbusClient disconnected');
            this.flagServerStatus = false;
        });

        // received data \
        this.modbusClient.on('data', (data) => {
            console.log(data.toString());

            // 輸出由 client 端發來的資料位元組長度
            console.log('socket.bytesRead is ' + this.modbusClient.bytesRead);
        });
    }
    //-------------------------------------------------------------
    sendModbusMessage2Server(cmd: DTCMD.iCmd) {
        this.modbusClient.write(JSON.stringify(cmd));
    }

    //-----------------------------------------------------------------------------
    //process 
    async systemRun() {
        await this.getNetworkLightNumber()
            .then((value) => {
                if (value.length > 0) {
                    this.drivers = value;
                    console.log("Found out lights:");
                    console.log(value.toString());
                    let cmd: DTCMD.iCmd =
                    {
                        cmdtype: modbusCmd.driverInfo,
                        cmdData: this.drivers
                    }
                    //send driver status to controprocess
                    this.sendModbusMessage2Server(cmd);
                }
                else {
                    this.drivers.length = 0;
                    console.log("no device");
                }
            });
        //calculate polling time    
        this.pollingTime = 1000 - this.drivers.length * 10;

        if (this.drivers.length > 0) {
            //polling time 
            setInterval(() => {
                this.devPkgMember.length = 0;//clear 
                this.pollingLocationInfo();//ask input register location data
            }, this.pollingTime)
        }
    }

    //------------------------------------------------------------------------------------
    async pollingLocationInfo() {
        for (let i = 0; i < this.drivers.length; i++) {
            console.log(this.drivers[i].lightID);
            await this.delay(pollingTimeStep);
            await this.readLightDevice(this.drivers[i].lightID)
                .then((value) => {
                    //sort device
                    this.sortDeviceTable(this.drivers[i].lightID, value);
                })
        }
        //write to server
        let cmd: DTCMD.iCmd =
        {
            cmdtype: modbusCmd.location,
            cmdData: this.devPkgMember
        }
        //send location information to controlprocess
        this.sendModbusMessage2Server(cmd);

    }

    //----------------------------------------------------------------------------------
    //read readable register group and number of register
    getReadableGroupWithCount(id: number): Promise<iReadableRegister> {
        return new Promise<iReadableRegister>((resolve, reject) => {
            let readableRegisterInfo: iReadableRegister = {};
            this.masterRs485.setSlave(id);
            let readCount: number = 1;

            this.masterRs485.readInputRegisters(inputregisterAddress.countReadableRegister, readCount)
                .then((value) => {
                    readableRegisterInfo.countReadableRegister = value[0];
                    resolve(readableRegisterInfo);
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //--------------------------------------------------------------------------
    //read registers of light
    getDevicRegister(id: number, readableRegisterInfo: iReadableRegister): Promise<number[]> {
        this.masterRs485.setSlave(id);
        let arrayDevicRegister: number[] = [];
        return new Promise<number[]>((resolve, reject) => {
            let startRegisterAddress: number = inputregisterAddress.g0Device000;
            this.masterRs485.readInputRegisters(startRegisterAddress, readableRegisterInfo.countReadableRegister)
                .then((value) => {
                    value.forEach(item => {
                        arrayDevicRegister.push(item);
                    });
                    resolve(arrayDevicRegister);
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //------------------------------------------------------------------------
    //read device register of light
    readLightDevice(lightID: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {

            this.getReadableGroupWithCount(lightID)
                .then((value) => {
                    setTimeout(() => {
                        this.getDevicRegister(lightID, value)
                            .then((value) => {
                                resolve(value);
                            })
                            .catch((errorMsg) => {
                                reject(errorMsg);
                            })
                    }, timeFunctionInterval);
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //-------------------------------------------------------------------
    //get exist light driver
    async getNetworkLightNumber(): Promise<iDriver[]> {
        let driversKeep: iDriver[] = [];
        let id = 0;
        for (let i: number = 0; i < maxLightIdKeep; i++) {
            id += 1;
            console.log('*Start query Light : ' + id.toString());
            await this.getLightInformation(id)
                .then((value) => {
                    console.log('Resopnse:');
                    console.log(value);
                    driversKeep.push(value);
                })
                .catch((errorMsg) => {
                    console.log('Resopnse error:' + errorMsg);
                });
            await this.delay(pollingTimeStep);
        }

        return new Promise<iDriver[]>((resolve, reject) => {
            resolve(driversKeep);
        });
    }

    //get light driver information
    getLightInformation(id: number): Promise<iDriver> {
        return new Promise<iDriver>((resolve, reject) => {
            let driverInfo: iDriver = {};
            this.masterRs485.setSlave(id);
            let readCount: number = inputregisterAddress.manufactureID + 1;

            this.masterRs485.readInputRegisters(inputregisterAddress.version, readCount)
                .then((value) => {
                    //console.log(value);
                    driverInfo.version = value[inputregisterAddress.version];
                    driverInfo.lightID = value[inputregisterAddress.lightID];
                    driverInfo.lightType = value[inputregisterAddress.lightType];
                    driverInfo.Mac = value[inputregisterAddress.lightMacH].toString(16) + value[inputregisterAddress.lightMacM].toString(16) + value[inputregisterAddress.lightMacL].toString(16);
                    driverInfo.manufactureID = value[inputregisterAddress.manufactureID];
                    readCount = holdingRegisterAddress.ckMax + 1;

                    setTimeout(() => {
                        this.masterRs485.readHoldingRegisters(holdingRegisterAddress.brightness, readCount)
                            .then(value => {
                                driverInfo.brightness = value[holdingRegisterAddress.brightness];
                                driverInfo.ck = value[holdingRegisterAddress.ck];
                                driverInfo.brightnessMin = value[holdingRegisterAddress.brightnessMin];
                                driverInfo.brightnessMax = value[holdingRegisterAddress.brightnessMax];
                                driverInfo.ckMin = value[holdingRegisterAddress.ckMin];
                                driverInfo.ckMax = value[holdingRegisterAddress.ckMax];
                                resolve(driverInfo);
                            })
                            .catch((errorMsg) => {
                                reject(errorMsg);
                            })
                    }, pollingTimeStep);
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //----------------------------------------------------------------------------------------
    //number array to uint8  array matrix
    getNumber2Uint8Matrix(num: number[]): Uint8Array[] {
        let matix: Uint8Array[] = [];
        let start: number = 0;
        let end: number = 0;
        let len: number = 0;
        let u8: Uint8Array = new Uint8Array(num.length * 2);
        let i: number = 0;

        num.forEach(item => {
            u8[i++] = (item >> 8) & 0xFF;
            u8[i++] = item & 0xFF;
        });

        while (end < (u8.length - 1)) {
            if (u8[start] == typesDevice.tag) {
                len = deviceLength.tagLen;
            }
            else if (u8[start] == typesDevice.dripStand) {
                len = deviceLength.dripStandLen;
            }
            else {
                break;
            }
            end = start + len;
            let partOfArry: Uint8Array = u8.subarray(start, end);
            matix.push(partOfArry);
            start = end;
        }
        return matix;
    }

    //-----------------------------------------------------------------------------
    //2 bytes to number
    byte2Number(hbyte: number, lbyte: number): number {
        let num: number = hbyte * 256 + lbyte;
        return num;
    }
    //-----------------------------------------------------------------------------
    //get device content
    paserProtocol2Dev(recLightID: number, u8: Uint8Array): iDevInfo {

        let dev: iDevInfo = {};
        dev.type = u8[devAddress.type];
        dev.seq = u8[devAddress.seq];
        dev.mac = '';
        for (let i: number = 0; i < 6; i++) {
            dev.mac += u8[devAddress.Mac + i].toString(16);
        }
        dev.lId1 = u8[devAddress.lId1];
        dev.lId2 = u8[devAddress.lId2];
        dev.br1 = this.byte2Number(u8[devAddress.br1], u8[devAddress.br1 + 1]);
        dev.br2 = this.byte2Number(u8[devAddress.br2], u8[devAddress.br2 + 1]);
        dev.rssi = -1 * this.byte2Number(u8[devAddress.rssi], u8[devAddress.rssi + 1]);
        dev.Gx = u8[devAddress.Gx];
        dev.Gy = u8[devAddress.Gy];
        dev.Gz = u8[devAddress.Gz];
        dev.batPow = u8[devAddress.batPow];
        dev.labelX = u8[devAddress.labelX];
        dev.labelY = u8[devAddress.labelY];
        dev.labelH = this.byte2Number(u8[devAddress.labelH], u8[devAddress.labelH + 1]);
        dev.recLightID = recLightID;
        switch (u8[0]) {
            case typesDevice.tag:
                dev.other = {};
                break;

            case typesDevice.dripStand:
                let other: iDripstand = {};
                other.weight = this.byte2Number(u8[otherDripStandAddress.weight], u8[otherDripStandAddress.weight + 1]);
                other.speed = this.byte2Number(u8[otherDripStandAddress.speed], u8[otherDripStandAddress.speed + 1]);
                dev.other = other;
                break;
        }
        return dev;
    }

    //--------------------------------------------------------------------------------------------------
    //group device by device mac
    sortDev(dev: iDevInfo) {
        let isContainDevice: boolean = false;
        if (this.devPkgMember.length > 0) {
            for (let i: number = 0; i < this.devPkgMember.length; i++) {
                if (this.devPkgMember[i].deviceMac == dev.mac) {
                    this.devPkgMember[i].deviceInfoArry.push(dev);
                    this.devPkgMember[i].deviceCount += 1;
                    isContainDevice = true;
                    break;
                }
            }
            if (isContainDevice == false) {
                let devPkg: iDevPkg = { deviceMac: dev.mac, deviceCount: 0, deviceInfoArry: [] };
                devPkg.deviceInfoArry.push(dev);
                devPkg.deviceCount += 1;
                this.devPkgMember.push(devPkg);
            }
        }
        else {
            let devPkg: iDevPkg = { deviceMac: dev.mac, deviceCount: 0, deviceInfoArry: [] };
            devPkg.deviceInfoArry.push(dev);
            devPkg.deviceCount += 1;
            this.devPkgMember.push(devPkg);
        }
    }
    //----------------------------------------------------------------------------------
    //get device table
    sortDeviceTable(recLightID: number, num: number[]) {
        //let devInfo: iDevInfo[] = [];
        let matrix: Uint8Array[] = this.getNumber2Uint8Matrix(num);//convert number to byte
        matrix.forEach(item => {
            this.sortDev(this.paserProtocol2Dev(recLightID, item));//paser byte data to device and sort it by mac
        });
    }
    //-------------------------------------------------------------------------------
    //delay function
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }
}


let modebusControl: ControlModbus = new ControlModbus();