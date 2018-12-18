import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevice, iReadableRegister, idripstand } from './dataTypeModbus'
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

enum typesDevice {
    tag = 0,
    dripStand = 1,
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

let timeFunctionInterval: number = 5;
let maxLightIdKeep: number = 5;//1~62


export class ProModbus {


    masterRs485: ModbusRTU;
    drivers: iDriver[];



    constructor() {
        this.masterRs485 = new ModbusRTU();

        this.process();
    }

    async process() {
        let x: number = 0x1234;

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
            await this.readLightDevice(this.drivers[i].lightID)
            .then((value)=>{
                this.drivers[i].deviceTable=this.getDeviceTable(value);
            })

        }
   



    }


    //read readable register group and number of register
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
    //read registers of light
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

            // await this.delay(timeFunctionInterval);
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
            end = start + len - 1;
            let partOfArry: Uint8Array = u8.subarray(start, end);
            matix.push(partOfArry);
            start = end + 1;
        }
        return matix;
    }


    //2 bytes to number
    byte2Number(hbyte: number, lbyte: number): number {
        let num: number = hbyte << 8 + lbyte;
        return num;
    }



    //get device content
    paserProtocol(u8: Uint8Array): iDevice {
        let dev: iDevice = {};
        dev.type = u8[devAddress.type];
        dev.seq = u8[devAddress.seq];
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
        dev.Gy = u8[devAddress.Gz];
        dev.batPow = u8[devAddress.batPow];
        dev.labelX = u8[devAddress.labelX];
        dev.labelY = u8[devAddress.labelY];
        dev.labelH = this.byte2Number(u8[devAddress.labelH], u8[devAddress.labelH + 1]);

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

    //get device table
    getDeviceTable(num: number[]): iDevice[] {
        let devInfo: iDevice[] = [];
        let matrix: Uint8Array[] = this.getNumber2Uint8Matrix(num);
        matrix.forEach(item => {
            devInfo.push(this.paserProtocol(item));
        });

        return devInfo;
    }


    //delay function
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }

}