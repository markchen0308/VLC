import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevice, iReadableRegister } from './dataTypeModbus'
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
    readableRegisterGroup = 10,
    countReadableRegister,
    g0Device000,
    g1Device000 = g0Device000 + 128,
}


let timeFunctionInterval: number = 100;
let maxLightIdKeep: number = 1;//1~62


export class ProModbus {


    masterRs485: ModbusRTU;
    drivers: iDriver[];



    constructor() {
        this.masterRs485 = new ModbusRTU();

        this.process();
    }

    async process() {
        await this.delay(1000);
        await this.getNetworkLightNumber()
            .then((value) => {
                console.log("Found out lights:");
                if(value.length>0)
                {
                    console.log(value.toString());
                }
                else
                {
                    console.log("no device");
                }
            })
    }


    getLightInformation(id: number): Promise<iDriver> {

        return new Promise<iDriver>((resolve, reject) => {
            id=3;
            let driverInfo: iDriver = {};
            this.masterRs485.setSlave(id);
            let readCount: number = inputregisterAddress.manufactureID + 1;
            this.masterRs485.readInputRegisters(inputregisterAddress.version, readCount)
                .then((value) => {
                    console.log(value)
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
                    }, timeFunctionInterval);
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }

    getReadableGroupWithCount(id: number): Promise<iReadableRegister> {
        return new Promise<iReadableRegister>((resolve, reject) => {
            let readableRegisterInfo: iReadableRegister = {};
            this.masterRs485.setSlave(id);
            let readCount: number = inputregisterAddress.countReadableRegister - inputregisterAddress.readableRegisterGroup + 1;
            this.masterRs485.readInputRegisters(inputregisterAddress.readableRegisterGroup, readCount)
                .then((value) => {
                    readableRegisterInfo.readableRegisterGroup = value[inputregisterAddress.readableRegisterGroup];
                    readableRegisterInfo.countReadableRegister = value[inputregisterAddress.countReadableRegister];
                    resolve(readableRegisterInfo);
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }

    getDevicRegister(id: number, readableRegisterInfo: iReadableRegister): Promise<number[]> {
        this.masterRs485.setSlave(id);
        let arrayDevicRegister: number[] = [];
        return new Promise<number[]>((resolve, reject) => {
            let startRegisterAddress: number = (readableRegisterInfo.readableRegisterGroup == 0) ? inputregisterAddress.g0Device000 : inputregisterAddress.g1Device000;
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

            await this.delay(timeFunctionInterval);
        }

        return new Promise<iDriver[]>((resolve, reject) => {
            resolve(driversKeep);
        });
    }




    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }

}