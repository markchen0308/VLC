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
let timeFunctionInterval = 100;
let maxLightIdKeep = 1; //1~62
class ProModbus {
    constructor() {
        this.masterRs485 = new modbusDriver_1.ModbusRTU();
        this.process();
    }
    async process() {
        await this.delay(1000);
        await this.getNetworkLightNumber()
            .then((value) => {
            console.log("Found out lights:");
            if (value.length > 0) {
                console.log(value.toString());
            }
            else {
                console.log("no device");
            }
        });
    }
    getLightInformation(id) {
        return new Promise((resolve, reject) => {
            id = 3;
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
            await this.delay(timeFunctionInterval);
        }
        return new Promise((resolve, reject) => {
            resolve(driversKeep);
        });
    }
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
}
exports.ProModbus = ProModbus;
//# sourceMappingURL=protocolModbus.js.map