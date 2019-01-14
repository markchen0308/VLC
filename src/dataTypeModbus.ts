

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


export interface iDevPkg {
    deviceMac?: string;
    deviceCount?: number;
    deviceInfoArry?: iDevInfo[];
}

export interface iDripstand {
    weight?: number;
    speed?: number;
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