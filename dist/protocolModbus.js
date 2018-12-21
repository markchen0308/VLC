"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    inputregisterAddress[inputregisterAddress["readableRegisterGroup"] = 10] = "readableRegisterGroup";
    inputregisterAddress[inputregisterAddress["countReadableRegister"] = 11] = "countReadableRegister";
    inputregisterAddress[inputregisterAddress["g0Device000"] = 12] = "g0Device000";
    inputregisterAddress[inputregisterAddress["g1Device000"] = 140] = "g1Device000";
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
let timeFunctionInterval = 5;
let maxLightIdKeep = 5; //1~62
class ProModbus {
    constructor() {
        this.masterRs485 = new modbusDriver_1.ModbusRTU();
        this.process();
    }
    async process() {
        let x = 0x1234;
        await this.delay(1000);
        //get exist driver in network
        await this.getNetworkLightNumber()
            .then((value) => {
            if (value.length > 0) {
                console.log("Found out lights:");
                this.drivers = value;
                console.log(value.toString());
            }
            else {
                this.drivers = [];
                console.log("no device");
            }
        });
        for (let i = 0; i < this.drivers.length; i++) {
            console.log(this.drivers[i].lightID);
            await this.readLightDevice(this.drivers[i].lightID)
                .then((value) => {
                this.drivers[i].deviceTable = this.getDeviceTable(value);
                this.drivers[i].deviceTable.forEach(item => {
                    console.log(item);
                });
            });
        }
    }
    //read readable register group and number of register
    getReadableGroupWithCount(id) {
        return new Promise((resolve, reject) => {
            let readableRegisterInfo = {};
            this.masterRs485.setSlave(id);
            let readCount = inputregisterAddress.countReadableRegister - inputregisterAddress.readableRegisterGroup + 1;
            this.masterRs485.readInputRegisters(inputregisterAddress.readableRegisterGroup, readCount)
                .then((value) => {
                readableRegisterInfo.readableRegisterGroup = value[0];
                readableRegisterInfo.countReadableRegister = value[1];
                resolve(readableRegisterInfo);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
    //read registers of light
    getDevicRegister(id, readableRegisterInfo) {
        this.masterRs485.setSlave(id);
        let arrayDevicRegister = [];
        return new Promise((resolve, reject) => {
            let startRegisterAddress = (readableRegisterInfo.readableRegisterGroup == 0) ? inputregisterAddress.g0Device000 : inputregisterAddress.g1Device000;
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
            // await this.delay(timeFunctionInterval);
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
                console.log(value);
                driverInfo.version = value[inputregisterAddress.version];
                driverInfo.lightID = value[inputregisterAddress.lightID];
                driverInfo.lightType = value[inputregisterAddress.lightType];
                driverInfo.Mac = value[inputregisterAddress.lightMacH].toString(16) + value[inputregisterAddress.lightMacM].toString(16) + value[inputregisterAddress.lightMacL].toString(16);
                driverInfo.manufactureID = value[inputregisterAddress.manufactureID];
                readCount = holdingRegisterAddress.ckMax + 1;
                console;
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
                }, timeFunctionInterval);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
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
        u8.forEach((item) => {
            console.log(item);
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
    //2 bytes to number
    byte2Number(hbyte, lbyte) {
        let num = hbyte * 256 + lbyte;
        return num;
    }
    //get device content
    paserProtocol(u8) {
        u8.forEach(item => {
            console.log(item);
        });
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
        dev.rssi = this.byte2Number(u8[devAddress.rssi], u8[devAddress.rssi + 1]);
        dev.Gx = u8[devAddress.Gx];
        dev.Gy = u8[devAddress.Gy];
        dev.Gz = u8[devAddress.Gz];
        dev.batPow = u8[devAddress.batPow];
        dev.labelX = u8[devAddress.labelX];
        dev.labelY = u8[devAddress.labelY];
        dev.labelH = this.byte2Number(u8[devAddress.labelH], u8[devAddress.labelH + 1]);
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
    //get device table
    getDeviceTable(num) {
        let devInfo = [];
        let matrix = this.getNumber2Uint8Matrix(num);
        matrix.forEach(item => {
            devInfo.push(this.paserProtocol(item));
        });
        return devInfo;
    }
    //delay function
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
}
exports.ProModbus = ProModbus;
//# sourceMappingURL=protocolModbus.js.map