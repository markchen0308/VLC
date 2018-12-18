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
    typesDevice[typesDevice["tag"] = 0] = "tag";
    typesDevice[typesDevice["dripStand"] = 1] = "dripStand";
})(typesDevice || (typesDevice = {}));
var deviceLength;
(function (deviceLength) {
    deviceLength[deviceLength["tagLen"] = 24] = "tagLen";
    deviceLength[deviceLength["dripStandLen"] = 28] = "dripStandLen"; //bytes
})(deviceLength || (deviceLength = {}));
var tagAddress;
(function (tagAddress) {
    tagAddress[tagAddress["type"] = 0] = "type";
    tagAddress[tagAddress["seq"] = 1] = "seq";
    tagAddress[tagAddress["Mac"] = 2] = "Mac";
    tagAddress[tagAddress["lId1"] = 8] = "lId1";
    tagAddress[tagAddress["lId2"] = 9] = "lId2";
    tagAddress[tagAddress["lightBr1"] = 10] = "lightBr1";
    tagAddress[tagAddress["lightBr2"] = 12] = "lightBr2";
    tagAddress[tagAddress["rssi"] = 14] = "rssi";
    tagAddress[tagAddress["Gx"] = 16] = "Gx";
    tagAddress[tagAddress["Gy"] = 17] = "Gy";
    tagAddress[tagAddress["Gz"] = 18] = "Gz";
    tagAddress[tagAddress["batPower"] = 19] = "batPower";
    tagAddress[tagAddress["labelX"] = 20] = "labelX";
    tagAddress[tagAddress["labelY"] = 21] = "labelY";
    tagAddress[tagAddress["labelHeight"] = 22] = "labelHeight";
})(tagAddress || (tagAddress = {}));
var dripStandAddress;
(function (dripStandAddress) {
    dripStandAddress[dripStandAddress["type"] = 0] = "type";
    dripStandAddress[dripStandAddress["seq"] = 1] = "seq";
    dripStandAddress[dripStandAddress["Mac"] = 2] = "Mac";
    dripStandAddress[dripStandAddress["lId1"] = 8] = "lId1";
    dripStandAddress[dripStandAddress["lId2"] = 9] = "lId2";
    dripStandAddress[dripStandAddress["lightBr1"] = 10] = "lightBr1";
    dripStandAddress[dripStandAddress["lightBr2"] = 12] = "lightBr2";
    dripStandAddress[dripStandAddress["rssi"] = 14] = "rssi";
    dripStandAddress[dripStandAddress["Gx"] = 16] = "Gx";
    dripStandAddress[dripStandAddress["Gy"] = 17] = "Gy";
    dripStandAddress[dripStandAddress["Gz"] = 18] = "Gz";
    dripStandAddress[dripStandAddress["batPower"] = 19] = "batPower";
    dripStandAddress[dripStandAddress["labelX"] = 20] = "labelX";
    dripStandAddress[dripStandAddress["labelY"] = 21] = "labelY";
    dripStandAddress[dripStandAddress["labelHeight"] = 22] = "labelHeight";
    dripStandAddress[dripStandAddress["weight"] = 24] = "weight";
    dripStandAddress[dripStandAddress["speed"] = 26] = "speed";
})(dripStandAddress || (dripStandAddress = {}));
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
    }
    getLightInformation(id) {
        return new Promise((resolve, reject) => {
            let driverInfo = {};
            this.masterRs485.setSlave(id);
            let readCount = inputregisterAddress.manufactureID + 1;
            this.masterRs485.readInputRegisters(inputregisterAddress.version, readCount)
                .then((value) => {
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
                }, timeFunctionInterval);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
    getReadableGroupWithCount(id) {
        return new Promise((resolve, reject) => {
            let readableRegisterInfo = {};
            this.masterRs485.setSlave(id);
            let readCount = inputregisterAddress.countReadableRegister - inputregisterAddress.readableRegisterGroup + 1;
            this.masterRs485.readInputRegisters(inputregisterAddress.readableRegisterGroup, readCount)
                .then((value) => {
                readableRegisterInfo.readableRegisterGroup = value[inputregisterAddress.readableRegisterGroup];
                readableRegisterInfo.countReadableRegister = value[inputregisterAddress.countReadableRegister];
                resolve(readableRegisterInfo);
            })
                .catch((errorMsg) => {
                reject(errorMsg);
            });
        });
    }
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
    async getLightDevices() {
        let driversKeep = [];
        let id = 0;
        for (let i = 0; i < this.drivers.length; i++) {
            await this.readLightDevice(this.drivers[i].lightID)
                .then((value) => {
                let numberDevideBy16 = value.length / 16;
                for (let j = 0; j < numberDevideBy16; j++) {
                    let k = j * numberDevideBy16;
                }
            })
                .catch((errorMsg) => {
            });
        }
        this.drivers.forEach(item => {
        });
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
    //number2Byte(num:number):Uint8Array
    //{
    // let u8:Uint8Array= new Uint8Array(2);
    // u8[0]=num & 0xFF;
    // u8[1]=(num >> 8) & 0xFF;
    // u8.
    // return u8;
    //}
    numberArray2ByteArry(num) {
        let u8 = new Uint8Array(num.length * 2);
        let i = 0;
        num.forEach(item => {
            u8[i++] = (item >> 8) & 0xFF;
            u8[i++] = item & 0xFF;
        });
        return u8;
    }
    byte2Number(hbyte, lbyte) {
        let num = hbyte << 8 + lbyte;
        return num;
    }
    byte2Number2s(hbyte, lbyte) {
        let i16 = new Int16Array(1);
        i16[0] = hbyte << 8 + lbyte;
        let num = i16[0];
        return num;
    }
    PaserProtocol(u8) {
        let dev = {};
        switch (u8[0]) {
            case typesDevice.tag:
                dev.type = u8[tagAddress.type];
                dev.seq = u8[tagAddress.seq];
                for (let i = 0; i < 6; i++) {
                    dev.mac += u8[tagAddress.Mac + i].toString(16);
                }
                dev.brightId1 = u8[tagAddress.lId1];
                dev.brightId2 = u8[tagAddress.lId2];
                dev.brightness1 = this.byte2Number(u8[tagAddress.lightBr1], u8[tagAddress.lightBr1 + 1]);
                dev.brightness2 = this.byte2Number(u8[tagAddress.lightBr2], u8[tagAddress.lightBr2 + 1]);
                dev.rssi = u8[tagAddress.rssi] + u8[tagAddress.rssi + 1];
                break;
            case typesDevice.dripStand:
                break;
        }
        return dev;
    }
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
}
exports.ProModbus = ProModbus;
//# sourceMappingURL=protocolModbus.js.map