
export interface iDriver {
    brightness:number;
    lightType:number;
    ck:number;
    brightnessMin:number;
    brightnessMax:number;
    ckMin:number;
    ckMax:number;
    lightID:number;
    Mac:string;
    manufacture:number;
    version:number;
    deviceNow:iDevice[];
}

export interface iDevice {
    deviceMac:string;
    deviceSeq:number;
    deviceType:number;
    deviceData:string;
}

