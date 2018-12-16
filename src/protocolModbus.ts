import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevice } from './dataTypeModbus'
import * as DTMODBUS from './dataTypeModbus';

import * as Enum from 'enum';
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
    g0Device0H,
    g0Device0L,
    g0Device1H,
    g0Device1L,
    g0Device2H,
    g0Device2L,
    g0Device3H,
    g0Device3L,
    g0Device4H,
    g0Device4L,
    g0Device5H,
    g0Device5L,
    g0Device6H,
    g0Device6L,
    g0Device7H,
    g0Device7L,
    g1Device0H,
    g1Device0L,
    g1Device1H,
    g1Device1L,
    g1Device2H,
    g1Device2L,
    g1Device3H,
    g1Device3L,
    g1Device4H,
    g1Device4L,
    g1Device5H,
    g1Device5L,
    g1Device6H,
    g1Device6L,
    g1Device7H,
    g1Device7L
}



export class ProModbus {


    masterRs485: ModbusRTU;
    drivers: iDriver[];



    constructor() {
        this.masterRs485 = new ModbusRTU();
    }



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
                    driverInfo.Mac= value[inputregisterAddress.lightMacH].toString(16) + value[inputregisterAddress.lightMacM].toString(16) + value[inputregisterAddress.lightMacL].toString(16);
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
                            .catch((value) => {
                                reject([]);
                            })
                    }, 5);

                })
                .catch((value) => {
                    reject([]);
                })
        });
    }

    async  getReadableGroupWithCount(id: number) {
        this.masterRs485.setSlave(id);
        let readCount: number = inputregisterAddress.countReadableRegister - inputregisterAddress.readableRegisterGroup + 1;
        let rx = await this.masterRs485.readInputRegisters(inputregisterAddress.readableRegisterGroup, readCount);
    }

    async getReadableRegister(id: number, readCount: number) {
        this.masterRs485.setSlave(id);
        let rx = await this.masterRs485.readInputRegisters(inputregisterAddress.g0Device0H, readCount);

    }

}