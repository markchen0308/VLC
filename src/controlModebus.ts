

import * as Net from 'net';//import socket module
import * as DTCMD from './dataTypeCmd';

let fs = require('fs');
let configfilePath = './config.json';

import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevInfo, iReadableRegister, iDripstand, iDevPkg, iRxLightInfo } from './dataTypeModbus';
import { holdingRegisterAddress, inputregisterAddress, typesDevice, deviceLength, devAddress, otherDripStandAddress, modbusCmd } from './dataTypeModbus';

import * as DTMODBUS from './dataTypeModbus';

import { promises, lstat } from 'fs';


let timeFunctionInterval: number = 5;
let maxLightIdKeep: number = 62;//max acount of light in a gw loop
let pollingTimeStep: number = 5;//polling time per light

export class ControlModbus {

    modbusClient: Net.Socket;
    modbusServerIP: string;
    modbusServerPort: number;

    masterRs485: ModbusRTU = new ModbusRTU();
    drivers: iDriver[] = [];
    devPkgMember: iDevPkg[] = [];
    pollingTime: number;

    flagServerStatus: boolean = false;
    flagModbusStatus: boolean = false;

    pollingPositionTimer: NodeJS.Timeout;
    fPollingEn: boolean;

    //-------------------------------------------------------------------------------
    constructor() {
        this.process();
    }

    async process() {
        this.startModbusClient();//create modbus client and connect to modbus server
        this.flagModbusStatus = await this.masterRs485.process();//open modbus


        if (this.flagServerStatus && this.flagModbusStatus)//server connected and modbus is ready
        {
            console.log('start modbus process');
            this.systemRun();
        }
        else {
            if (this.flagServerStatus == false) {
                console.log('Can not connect to modbus server!');
            }

            if (this.flagModbusStatus == false) {
                console.log('RS485 device is not ready');
            }
        }
    }

    //-----------------------------------------------------------------------
    async startModbusClient() {
        await this.readConfigFile();//read config.json
        this.configureClient();// connect to modbus server
    }
    //----------------------------------------------------------------------------
    readConfigFile(): Promise<any> //read config.json
    {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.modbusServerPort = configJson.scoketModbusServerPort;//get server port
            this.modbusServerIP = configJson.scoketModbusServerIP;//get server ip
            resolve(true);
        });
    }

    //-------------------------------------------------------------------------------
    configureClient() // connect to modbus server
    {

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
    //run system 
    async systemRun() {
        //get information of drivers on network
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
                    this.sendModbusMessage2Server(cmd);//sent driver information to server
                }
                else {
                    this.drivers.length = 0;
                    console.log("no device");
                }
            });

        //calculate polling time    
        this.pollingTime = 1000 - this.drivers.length * 10;
        this.fPollingEn = true;//enable polling drivers

        if (this.drivers.length > 0) {
            //polling time 
            this.pollingPositionTimer = setInterval(() => {
                if (this.fPollingEn == true)//allow polling
                {
                    this.devPkgMember.length = 0;//clear devPkgMember
                    this.pollingLocationInfo();//ask input register location data
                }
                else//reject polling
                {
                    clearInterval(this.pollingPositionTimer);//stop polling 
                }

            }, this.pollingTime)
        }
    }

    //------------------------------------------------------------------------------------
    async pollingLocationInfo() {
        for (let i = 0; i < this.drivers.length; i++) {
            console.log(this.drivers[i].lightID);
            await this.delay(pollingTimeStep);//delay 5ms
            await this.readDevicePosition(this.drivers[i].lightID)//read device information,get register array
                .then((value) => {
                    //parse array and sort device
                    this.sortDeviceTable(this.drivers[i].lightID, value);//get sort of device package array,devPkgMember
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
    //read readable  number of register
    getReadableNumber(id: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            let len: number;
            this.masterRs485.setSlaveID(id);
            let readCount: number = 1;

            this.masterRs485.readInputRegisters(inputregisterAddress.countReadableRegister, readCount)
                .then((value) => {
                    len = value[0];//record data length
                    resolve(len);//return data length
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //--------------------------------------------------------------------------
    //read registers of light
    getDevicRegisterData(id: number, len: number): Promise<number[]> {
        this.masterRs485.setSlaveID(id);
        let arrayDevicRegister: number[] = [];
        return new Promise<number[]>((resolve, reject) => {
            let startRegisterAddress: number = inputregisterAddress.g0Device000;
            this.masterRs485.readInputRegisters(startRegisterAddress, len)
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
    readDevicePosition(lightID: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            //read length
            this.getReadableNumber(lightID)
                .then((value) => {//get length
                    if (value > 0)//length>0
                     {
                        setTimeout(() => {
                            //read device location data after timeFunctionInterval,return register array
                            this.getDevicRegisterData(lightID, value)
                                .then((value) => {
                                    resolve(value);
                                })
                                .catch((errorMsg) => {
                                    reject(errorMsg);
                                })
                        }, timeFunctionInterval);
                    }

                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //-------------------------------------------------------------------
    //get exist light driver on the network
    async getNetworkLightNumber(): Promise<iDriver[]> {
        let driversKeep: iDriver[] = [];
        let id = 0;
        for (let i: number = 0; i < maxLightIdKeep; i++) {
            id += 1;
            console.log('*Start query Light : ' + id.toString());
            await this.getLightInformation(id)
                .then((value) => {//value is driverInfo
                    console.log('Resopnse:');
                    console.log(value);
                    driversKeep.push(value);//save driver
                })
                .catch((errorMsg) => {
                    console.log('Resopnse error:' + errorMsg);
                });
            await this.delay(pollingTimeStep);//read next light after 5msec
        }

        return new Promise<iDriver[]>((resolve, reject) => {
            resolve(driversKeep);
        });
    }
    //-------------------------------------------------------------------
    //get light driver information
    getLightInformation(id: number): Promise<iDriver> {
        return new Promise<iDriver>((resolve, reject) => {
            let driverInfo: iDriver = {};
            this.masterRs485.setSlaveID(id);
            let readCount: number = inputregisterAddress.manufactureID + 1;//read 7 register

            //read 7 register from version
            this.masterRs485.readInputRegisters(inputregisterAddress.version, readCount)
                .then((value) => {
                    //console.log(value);
                    driverInfo.version = value[inputregisterAddress.version];
                    driverInfo.lightID = value[inputregisterAddress.lightID];
                    driverInfo.lightType = value[inputregisterAddress.lightType];
                    driverInfo.Mac = value[inputregisterAddress.lightMacH].toString(16) + value[inputregisterAddress.lightMacM].toString(16) + value[inputregisterAddress.lightMacL].toString(16);
                    driverInfo.manufactureID = value[inputregisterAddress.manufactureID];
                    readCount = holdingRegisterAddress.ckMax + 1;

                    //after 5ms ,read holding register
                    setTimeout(() => {
                        this.masterRs485.readHoldingRegisters(holdingRegisterAddress.brightness, readCount)
                            .then(value => {
                                driverInfo.brightness = value[holdingRegisterAddress.brightness];
                                driverInfo.ck = value[holdingRegisterAddress.ck];
                                driverInfo.brightnessMin = value[holdingRegisterAddress.brightnessMin];
                                driverInfo.brightnessMax = value[holdingRegisterAddress.brightnessMax];
                                driverInfo.ckMin = value[holdingRegisterAddress.ckMin];
                                driverInfo.ckMax = value[holdingRegisterAddress.ckMax];
                                driverInfo.bleEnable = value[holdingRegisterAddress.fBleRxEn];
                                resolve(driverInfo);
                            })
                            .catch((errorMsg) => {
                                reject(errorMsg);
                            })
                    }, pollingTimeStep);
                })
                .catch((errorMsg) => { //timeout
                    reject(errorMsg);//error
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
        if (this.devPkgMember.length > 0) //devPkgMember is not empty
        {
            for (let i: number = 0; i < this.devPkgMember.length; i++) {
                if (this.devPkgMember[i].mac == dev.mac) //does devPkgMember contain device?
                {
                    let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
                    this.devPkgMember[i].rxLightCount += 1;
                    this.devPkgMember[i].rxLightInfo.push(rxLightInfo);//save device into deviceInfoArry
                    isContainDevice = true;//mark 
                    break;//break the loop
                }
            }

            if (isContainDevice == false) //devPkgMember does not contain device
            {
                let devPkg: iDevPkg = {};
                devPkg.type = dev.type;
                devPkg.mac = dev.mac;
                devPkg.seq = dev.seq;
                devPkg.lId1 = dev.lId1;
                devPkg.lId2 = dev.lId2;
                devPkg.br1 = dev.br1;
                devPkg.br2 = dev.br2;
                devPkg.Gx = dev.Gx;
                devPkg.Gy = dev.Gy;
                devPkg.Gz = dev.Gz;
                devPkg.batPow = dev.batPow;
                devPkg.labelY = dev.labelX;
                devPkg.labelY = dev.labelY;
                devPkg.other = dev.other;
                devPkg.rxLightCount = 1;
                devPkg.rxLightInfo = [];
                let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
                devPkg.rxLightInfo.push(rxLightInfo);
                this.devPkgMember.push(devPkg);//save devPkg into devPkgMember
            }
        }
        else   //devPkgMember is empty, 
        {
            let devPkg: iDevPkg = {};
            devPkg.type = dev.type;
            devPkg.mac = dev.mac;
            devPkg.seq = dev.seq;
            devPkg.lId1 = dev.lId1;
            devPkg.lId2 = dev.lId2;
            devPkg.br1 = dev.br1;
            devPkg.br2 = dev.br2;
            devPkg.Gx = dev.Gx;
            devPkg.Gy = dev.Gy;
            devPkg.Gz = dev.Gz;
            devPkg.batPow = dev.batPow;
            devPkg.labelY = dev.labelX;
            devPkg.labelY = dev.labelY;
            devPkg.other = dev.other;
            devPkg.rxLightCount = 1;
            devPkg.rxLightInfo = [];
            let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
            devPkg.rxLightInfo.push(rxLightInfo);
            this.devPkgMember.push(devPkg);//save devPkg into devPkgMember
        }
    }
    //----------------------------------------------------------------------------------
    //get device table
    sortDeviceTable(recLightID: number, num: number[]) {
        //let devInfo: iDevInfo[] = [];
        let matrix: Uint8Array[] = this.getNumber2Uint8Matrix(num);//convert number to byte
        matrix.forEach(item => {
            let dev: iDevInfo = this.paserProtocol2Dev(recLightID, item);//parse device information
            this.sortDev(dev);//sort dev by mac
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