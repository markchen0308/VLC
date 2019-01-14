"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Net = require("net"); //import socket module
let fs = require('fs');
let configfilePath = './config.json';
const modbusDriver_1 = require("./modbusDriver");
var holdingRegisterAddress;
(function (holdingRegisterAddress) {
    holdingRegisterAddress[holdingRegisterAddress["brightness"] = 0] = "brightness";
    holdingRegisterAddress[holdingRegisterAddress["ck"] = 1] = "ck";
    holdingRegisterAddress[holdingRegisterAddress["brightnessMin"] = 2] = "brightnessMin";
    holdingRegisterAddress[holdingRegisterAddress["brightnessMax"] = 3] = "brightnessMax";
    holdingRegisterAddress[holdingRegisterAddress["ckMin"] = 4] = "ckMin";
    holdingRegisterAddress[holdingRegisterAddress["ckMax"] = 5] = "ckMax";
})(holdingRegisterAddress || (holdingRegisterAddress = {}));
var inputregisterAddress;
(function (inputregisterAddress) {
    inputregisterAddress[inputregisterAddress["version"] = 0] = "version";
    inputregisterAddress[inputregisterAddress["lightID"] = 1] = "lightID";
    inputregisterAddress[inputregisterAddress["lightType"] = 2] = "lightType";
    inputregisterAddress[inputregisterAddress["lightMacH"] = 3] = "lightMacH";
    inputregisterAddress[inputregisterAddress["lightMacM"] = 4] = "lightMacM";
    inputregisterAddress[inputregisterAddress["lightMacL"] = 5] = "lightMacL";
    inputregisterAddress[inputregisterAddress["manufactureID"] = 6] = "manufactureID";
    inputregisterAddress[inputregisterAddress["countReadableRegister"] = 10] = "countReadableRegister";
    inputregisterAddress[inputregisterAddress["g0Device000"] = 11] = "g0Device000";
})(inputregisterAddress || (inputregisterAddress = {}));
var typesDevice;
(function (typesDevice) {
    typesDevice[typesDevice["tag"] = 1] = "tag";
    typesDevice[typesDevice["dripStand"] = 2] = "dripStand";
})(typesDevice || (typesDevice = {}));
var deviceLength;
(function (deviceLength) {
    deviceLength[deviceLength["tagLen"] = 24] = "tagLen";
    deviceLength[deviceLength["dripStandLen"] = 28] = "dripStandLen"; //bytes
})(deviceLength || (deviceLength = {}));
var devAddress;
(function (devAddress) {
    devAddress[devAddress["type"] = 0] = "type";
    devAddress[devAddress["seq"] = 1] = "seq";
    devAddress[devAddress["Mac"] = 2] = "Mac";
    devAddress[devAddress["lId1"] = 8] = "lId1";
    devAddress[devAddress["lId2"] = 9] = "lId2";
    devAddress[devAddress["br1"] = 10] = "br1";
    devAddress[devAddress["br2"] = 12] = "br2";
    devAddress[devAddress["rssi"] = 14] = "rssi";
    devAddress[devAddress["Gx"] = 16] = "Gx";
    devAddress[devAddress["Gy"] = 17] = "Gy";
    devAddress[devAddress["Gz"] = 18] = "Gz";
    devAddress[devAddress["batPow"] = 19] = "batPow";
    devAddress[devAddress["labelX"] = 20] = "labelX";
    devAddress[devAddress["labelY"] = 21] = "labelY";
    devAddress[devAddress["labelH"] = 22] = "labelH";
})(devAddress || (devAddress = {}));
var otherDripStandAddress;
(function (otherDripStandAddress) {
    otherDripStandAddress[otherDripStandAddress["weight"] = 24] = "weight";
    otherDripStandAddress[otherDripStandAddress["speed"] = 26] = "speed";
})(otherDripStandAddress || (otherDripStandAddress = {}));
var modbusCmd;
(function (modbusCmd) {
    modbusCmd[modbusCmd["driverInfo"] = 1] = "driverInfo";
    modbusCmd[modbusCmd["location"] = 2] = "location";
})(modbusCmd || (modbusCmd = {}));
let timeFunctionInterval = 5;
let maxLightIdKeep = 62; //max acount of light in a gw loop
let pollingTimeStep = 5; //polling time per light
class ControlModbus {
    //-------------------------------------------------------------------------------
    constructor() {
        this.masterRs485 = new modbusDriver_1.ModbusRTU();
        this.drivers = [];
        this.devPkgMember = [];
        this.flagServerStatus = false;
        this.flagModbusStatus = false;
        this.process();
    }
    async process() {
        this.startClient(); //connect to server
        this.flagModbusStatus = await this.masterRs485.process(); //open modbus
        // await this.delay(1000);//wait modbus ready
        if (this.flagServerStatus && this.flagModbusStatus) //server connected and modbus is ready
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
    readConfigFile() {
        return new Promise((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8'); //read config.json file
            let configJson = JSON.parse(configJsonFile); //parse coonfig.json file
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
    sendModbusMessage2Server(cmd) {
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
                let cmd = {
                    cmdtype: modbusCmd.driverInfo,
                    cmdData: this.drivers
                };
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
                this.devPkgMember.length = 0; //clear 
                this.pollingLocationInfo(); //ask input register location data
            }, this.pollingTime);
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
            });
        }
        //write to server
        let cmd = {
            cmdtype: modbusCmd.location,
            cmdData: this.devPkgMember
        };
        //send location information to controlprocess
        this.sendModbusMessage2Server(cmd);
    }
    //----------------------------------------------------------------------------------
    //read readable register group and number of register
    getReadableGroupWithCount(id) {
        return new Promise((resolve, reject) => {
            let readableRegisterInfo = {};
            this.masterRs485.setSlave(id);
            let readCount = 1;
            this.masterRs485.readInputRegisters(inputregisterAddress.countReadableRegister, readCount)
                .then((value) => {
                readableRegisterInfo.countReadableRegister = value[0];
                resolve(readableRegisterInfo);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
    //--------------------------------------------------------------------------
    //read registers of light
    getDevicRegister(id, readableRegisterInfo) {
        this.masterRs485.setSlave(id);
        let arrayDevicRegister = [];
        return new Promise((resolve, reject) => {
            let startRegisterAddress = inputregisterAddress.g0Device000;
            this.masterRs485.readInputRegisters(startRegisterAddress, readableRegisterInfo.countReadableRegister)
                .then((value) => {
                value.forEach(item => {
                    arrayDevicRegister.push(item);
                });
                resolve(arrayDevicRegister);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
    //------------------------------------------------------------------------
    //read device register of light
    readLightDevice(lightID) {
        return new Promise((resolve, reject) => {
            this.getReadableGroupWithCount(lightID)
                .then((value) => {
                setTimeout(() => {
                    this.getDevicRegister(lightID, value)
                        .then((value) => {
                        resolve(value);
                    })
                        .catch((errorMsg) => {
                        reject(errorMsg);
                    });
                }, timeFunctionInterval);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
    //-------------------------------------------------------------------
    //get exist light driver
    async getNetworkLightNumber() {
        let driversKeep = [];
        let id = 0;
        for (let i = 0; i < maxLightIdKeep; i++) {
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
        return new Promise((resolve, reject) => {
            resolve(driversKeep);
        });
    }
    //get light driver information
    getLightInformation(id) {
        return new Promise((resolve, reject) => {
            let driverInfo = {};
            this.masterRs485.setSlave(id);
            let readCount = inputregisterAddress.manufactureID + 1;
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
                    });
                }, pollingTimeStep);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
    //----------------------------------------------------------------------------------------
    //number array to uint8  array matrix
    getNumber2Uint8Matrix(num) {
        let matix = [];
        let start = 0;
        let end = 0;
        let len = 0;
        let u8 = new Uint8Array(num.length * 2);
        let i = 0;
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
            let partOfArry = u8.subarray(start, end);
            matix.push(partOfArry);
            start = end;
        }
        return matix;
    }
    //-----------------------------------------------------------------------------
    //2 bytes to number
    byte2Number(hbyte, lbyte) {
        let num = hbyte * 256 + lbyte;
        return num;
    }
    //-----------------------------------------------------------------------------
    //get device content
    paserProtocol2Dev(recLightID, u8) {
        let dev = {};
        dev.type = u8[devAddress.type];
        dev.seq = u8[devAddress.seq];
        dev.mac = '';
        for (let i = 0; i < 6; i++) {
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
                let other = {};
                other.weight = this.byte2Number(u8[otherDripStandAddress.weight], u8[otherDripStandAddress.weight + 1]);
                other.speed = this.byte2Number(u8[otherDripStandAddress.speed], u8[otherDripStandAddress.speed + 1]);
                dev.other = other;
                break;
        }
        return dev;
    }
    //--------------------------------------------------------------------------------------------------
    //group device by device mac
    sortDev(dev) {
        let isContainDevice = false;
        if (this.devPkgMember.length > 0) {
            for (let i = 0; i < this.devPkgMember.length; i++) {
                if (this.devPkgMember[i].deviceMac == dev.mac) {
                    this.devPkgMember[i].deviceInfoArry.push(dev);
                    this.devPkgMember[i].deviceCount += 1;
                    isContainDevice = true;
                    break;
                }
            }
            if (isContainDevice == false) {
                let devPkg = { deviceMac: dev.mac, deviceCount: 0, deviceInfoArry: [] };
                devPkg.deviceInfoArry.push(dev);
                devPkg.deviceCount += 1;
                this.devPkgMember.push(devPkg);
            }
        }
        else {
            let devPkg = { deviceMac: dev.mac, deviceCount: 0, deviceInfoArry: [] };
            devPkg.deviceInfoArry.push(dev);
            devPkg.deviceCount += 1;
            this.devPkgMember.push(devPkg);
        }
    }
    //----------------------------------------------------------------------------------
    //get device table
    sortDeviceTable(recLightID, num) {
        //let devInfo: iDevInfo[] = [];
        let matrix = this.getNumber2Uint8Matrix(num); //convert number to byte
        matrix.forEach(item => {
            this.sortDev(this.paserProtocol2Dev(recLightID, item)); //paser byte data to device and sort it by mac
        });
    }
    //-------------------------------------------------------------------------------
    //delay function
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
}
exports.ControlModbus = ControlModbus;
let modebusControl = new ControlModbus();
//# sourceMappingURL=controlModebus.js.map