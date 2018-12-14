import { ModbusRTU } from './modbusDriver';
import * as DTMODBUS from './dataTypeModbus';

import * as Enum from 'enum';

let holdingRegisterAddress:Enum=new Enum({
    'brightness':0,
    'ck':1,
    'brightnessMin':2,
    'brightnessMax':3,
    'ckMin':4,
    'ckMax':5
})

let inputregisterAddress: Enum = new Enum({
    'version':0,
    'lightID':1,
    'lightType':2,
    'lightMacH':3,
    'lightMacM':4,
    'lightMacL':5,
    'manufactureID':6,
    'readableRegisterGroup':10,
    'countReadableRegister':11,
    'g0Device0H':12,
    'g0Device0L':13,
    'g0Device1H':14,
    'g0Device1L':15,
    'g0Device2H':16,
    'g0Device2L':17,
    'g0Device3H':18,
    'g0Device3L':19,
    'g0Device4H':20,
    'g0Device4L':21,
    'g0Device5H':22,
    'g0Device5L':23,
    'g0Device6H':24,
    'g0Device6L':25,
    'g0Device7H':26,
    'g0Device7L':27,
    'g1Device0H':28,
    'g1Device0L':29,
    'g1Device1H':30,
    'g1Device1L':31,
    'g1Device2H':32,
    'g1Device2L':33,
    'g1Device3H':34,
    'g1Device3L':35,
    'g1Device4H':36,
    'g1Device4L':37,
    'g1Device5H':38,
    'g1Device5L':39,
    'g1Device6H':40,
    'g1Device6L':41,
    'g1Device7H':42,
    'g1Device7L':43
});




export class ProModbus {
    masterRs485:ModbusRTU;
    constructor()
    {
        this.masterRs485=new ModbusRTU();

        console.log(holdingRegisterAddress.brightness.value);
    }

    getLightInformation(id:number)
    {
        this.masterRs485.setSlave(id) ;
        this.masterRs485.readHoldingRegisters(inputregisterAddress.version.value,inputregisterAddress.manufactureID+1);    
    }

    
}