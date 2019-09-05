

export interface iDriver {
    brightness?: number;
    lightType?: number;
    ck?: number;
    brightnessMin?: number;
    brightnessMax?: number;
    ckMin?: number;
    ckMax?: number;
    lightID?: number;
    Mac?: string;
    manufactureID?: number;
    version?: number;
    bleEnable?:number;
    onOff?:number;
}


export interface iDevInfo {
    type?: number;
    mac?: string;
    seq?: number;
    lId1?: number;
    br1?: number;
    lId2?: number;
    br2?: number;
    rssi?: number;
    labelX?: number;
    labelY?: number;
    labelH?: number;
    Gx?: number;
    Gy?: number;
    Gz?: number;
    batPow?: number;
    recLightID?: number;
    other?: {};
}

export interface iDevInfoAI {
    type?: number;
    mac?: string;
    seq?: number;
    lid1?: number;
    lid2?: number;
    lid3?: number;
    lid4?: number;
    lid5?: number;
    br1?: number;
    br2?: number;
    br3?: number;
    br4?: number;
    br5?: number;
    rssi?: number;
    label?: number;
    batPow?: number;
    recLightID?: number;
    other?: {};
} 

export interface iRxLightInfo
{
    recLightID?:number;
    rssi?:number;
}

export interface iDevPkg {
    type?: number;
    seq?:number;
    mac?: string;
    lId1?: number;
    br1?: number;
    lId2?: number;
    br2?: number;
    labelX?: number;
    labelY?: number;
    labelH?: number;
    Gx?: number;
    Gy?: number;
    Gz?: number;
    batPow?: number;
    other?: {};
    rxLightCount?: number;
    rxLightInfo?: iRxLightInfo[];
}
export interface iDevPkgAI {
    type?: number;
    seq?:number;
    mac?: string;
    lid1?: number;
    lid2?:number;
    lid3?:number;
    lid4?:number;
    lid5?:number;

    br1?: number;
    br2?: number;
    br3?: number;
    br4?: number;
    br5?: number;
    label?: number;
    batPow?: number;
    other?: {};
    rxLightCount?: number;
    rxLightInfo?: iRxLightInfo[];
}
export interface iDripstand {
    weight?: number;
    speed?: number;
    time?:number;
}


export interface iReadableRegister {
    countReadableRegister?: number;
}



export interface iGwInf {
    GatewaySeq?: number,
    GatewayIP?: string,
    GatewayMAC?: string,
    Datetime?: string,
    devPkgCount?: number,
    devPkgMember?: iDevPkg[]//array
}

export interface iGwPkg {
    GatewaySeqMin?: number,
    GatewaySeqMax?: number,
    DateTimeMin?: string,
    DateTimeMax?: string,
    GatewayHistoryCount?: number,
    GatewayHistoryMember?: iGwInf[]//array
}


export interface iWebPkg{
    reply ? :number,
    msg ? :any
}

export enum holdingRegisterAddress {
    brightness = 0,
    ck,
    brightnessMin,
    brightnessMax,
    ckMin,
    ckMax,
    fBleRxEn,
    onOff,
    queryTime
}

export enum holdingRegistersAddress {
    ck,
}

export enum inputregisterAddress {
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

export enum typesDevice {
    tag = 1,
    dripStand,
}

export enum deviceLength {
    tagLen = 24,  //bytes
    dripStandLen = 30  //bytes
}

export enum deviceLengthAI {
    tagLen = 30,  //bytes
    dripStandLen = 30  //bytes
}

export enum devAddress {
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

export enum devAddressAI {
    type = 0,
    seq = 1,
    Mac = 2,
    lid1 = 8,
    lid2 =9,
    lid3 =10,
    lid4 =11,
    lid5 =12,
    br1  =13,
    br2  =15,
    br3  =17,
    br4  =19,
    br5  =21,
    rssi = 23,
    batPow = 25,
    label=26
 
}

export enum otherDripStandAddress {
    weight = 24,
    speed = 26,
    time=27
}


export enum modbusCmd {
    driverInfo = 1,
    location,
}

export enum webCmd {
    getTodaylast = 1,
    getTodayAfter,
    getToday,
    getYesterday,
    getDate,
    getDriver,
    setClientServer,
    postReset,
    postDimingBrightness,
    postDimingCT,
    postDimingXY,
    postSwitchOnOff,
    msgError=404
  }

  export enum driverlightType{
      none =0,
      oneColor=1,
      twoColor=2.
  }
  