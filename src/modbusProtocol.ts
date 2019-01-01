

import * as Net from 'net';//import socket module
import * as DTCMD from './dataTypeCmd';

let fs = require('fs');
let configfilePath = './config.json';



import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevice, iReadableRegister, idripstand, iDeviceClassfy } from './dataTypeModbus';

import * as DTMODBUS from './dataTypeModbus';

import { promises } from 'fs';


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
    location = 1,
  
}

let timeFunctionInterval: number = 5;
let maxLightIdKeep: number = 62;//max acount of light in a gw loop
let pollingTimeStep: number = 5;

export class ProModbus {

    modbusClient: Net.Socket;
    modbusServerIP: string;
    modbusServerPort: number;

    masterRs485: ModbusRTU;
   drivers: iDriver[];
    deviceClassfy: iDeviceClassfy[] = [];
    pollingTime: number;


    constructor() {

        this.startClient();

        this.masterRs485 = new ModbusRTU();
        this.process();
    }

    async startClient() {
        await this.readConfigFile();
        this.configureClint();
    }

    configureClint() {

        //get reply information from server 
        //this.socketWebserver.on('data', (data) => {
        //       let cmdString:any=data
        //       let cmd=JSON.parse(cmdString);
        //      console.dir(cmd);
        // });
        this.modbusClient = Net.connect(this.modbusServerPort, this.modbusServerIP, () => {
            console.log(`modbusClient connected to: ${this.modbusClient.address} :  ${this.modbusClient.localPort}`);
        });

        this.modbusClient.on('end', () => {
            console.log('modbusClient disconnected');
        });

        // received data \
        this.modbusClient.on('data', (data) => {
            console.log(data.toString());

            // 輸出由 client 端發來的資料位元組長度
            console.log('socket.bytesRead is ' + this.modbusClient.bytesRead);
        });

    }

    sendModbusMessage2Server(cmd: DTCMD.iCmd) {
        this.modbusClient.write(JSON.stringify(cmd));
    }



    readConfigFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.modbusServerPort = configJson.scoketModbusServerPort;
            this.modbusServerIP = configJson.scoketModbusServerIP;
            resolve(true);
        });
    }


    initSocket() {
        let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
        let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
        let serverPort = configJson.scoketWebServerPort;
        let serverIp = configJson.socketWebServerIP;
    }
    //process 
    async process() {

        await this.delay(1000);//wait modbus ready
        if (this.masterRs485.isDeviceOk) {
            await this.getNetworkLightNumber()
                .then((value) => {

                    if (value.length > 0) {

                        this.drivers = value;
                        console.log("Found out lights:");
                        console.log(value.toString());
                    }
                    else {
                        this.drivers.length=0;
                        console.log("no device");
                    }
                });
            this.pollingTime = 1000 - this.drivers.length * 10;


            if (this.drivers.length > 0) {
                //polling time 
                setInterval(() => {
                    this.deviceClassfy.length=0;//clear 
                    this.pollingLocationInfo();//ask input register location data
                }, this.pollingTime)
            }
        }
        else {
            console.log('modbus stick is nor exist!');
        }
        //get exist driver in network
    }

    //------------------------------------------------------------------------------------
    async pollingLocationInfo() {
        for (let i = 0; i < this.drivers.length; i++) {
            console.log(this.drivers[i].lightID);
            await this.delay(pollingTimeStep);
            await this.readLightDevice(this.drivers[i].lightID)
                .then((value) => {
                    this.sortDeviceTable(this.drivers[i].lightID, value);
                    
                })
        }
        //write to server
        let cmd:DTCMD.iCmd=
        {
            cmdtype:modbusCmd.location,
            cmdData:this.deviceClassfy
        }
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


    //2 bytes to number
    byte2Number(hbyte: number, lbyte: number): number {
        let num: number = hbyte * 256 + lbyte;
        return num;
    }

    //get device content
    paserProtocol2Dev(recLightID: number, u8: Uint8Array): iDevice {

        let dev: iDevice = {};
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
                let other: idripstand = {};
                other.weight = this.byte2Number(u8[otherDripStandAddress.weight], u8[otherDripStandAddress.weight + 1]);
                other.speed = this.byte2Number(u8[otherDripStandAddress.speed], u8[otherDripStandAddress.speed + 1]);
                dev.other = other;
                break;
        }
        return dev;
    }

    //--------------------------------------------------------------------------------------------------
    //group device by device mac
    sortDev(dev: iDevice) {
        let isContainDevice: boolean = false;
        if (this.deviceClassfy.length > 0) {
            for (let i: number = 0; i < this.deviceClassfy.length; i++) {
                if (this.deviceClassfy[i].mac == dev.mac) {
                    this.deviceClassfy[i].deviceInfo.push(dev);
                    isContainDevice = true;
                    break;
                }
            }
            if (isContainDevice == false) {
                let deviceClassfy: iDeviceClassfy = { mac: dev.mac, deviceInfo: [] };
                deviceClassfy.deviceInfo.push(dev);
                this.deviceClassfy.push(deviceClassfy);
            }
        }
        else {
            let deviceClassfy: iDeviceClassfy = { mac: dev.mac, deviceInfo: [] };
            deviceClassfy.deviceInfo.push(dev);
            this.deviceClassfy.push(deviceClassfy);
        }
    }
    //----------------------------------------------------------------------------------
    //get device table
    sortDeviceTable(recLightID: number, num: number[]) {
        let devInfo: iDevice[] = [];
        let matrix: Uint8Array[] = this.getNumber2Uint8Matrix(num);//convert number to byte
        matrix.forEach(item => {
            this.sortDev(this.paserProtocol2Dev(recLightID, item));//paser byte data to device and sort it by mac
            // devInfo.push(this.paserProtocol2Dev(recLightID, item));
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