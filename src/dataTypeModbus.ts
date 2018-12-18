
export interface iDriver {
    brightness?:number;
    lightType?:number;
    ck?:number;
    brightnessMin?:number;
    brightnessMax?:number;
    ckMin?:number;
    ckMax?:number;
    lightID?:number;
    Mac?:string;
    manufactureID?:number;
    version?:number;
    deviceTable?:iDevice[];
}

export interface iDevice {
    type?:number;
    mac?:string;
    seq?:number;
    lId1?:number;
    br1?:number;
    lId2?:number;
    br2?:number;
    rssi?:number;
    labelX?:number;
    labelY?:number;
    labelH?:number;
    Gx?:number;
    Gy?:number;
    Gz?:number;
    batPow?:number;
    other?:{};
}

export interface idripstand {
    weight?:number,
    speed?:number
}


export interface iReadableRegister {
    readableRegisterGroup ?:number;
    countReadableRegister?:number;
}