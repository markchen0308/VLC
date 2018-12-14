
export interface InterGatewayDriver {
    brightness:number;
    lightType:number;
    ck:number;
    lightID:number;
    Mac:string;
    manufacture:number;
    version:number;
    deviceNow:Device[];
}

export interface Device {
    deviceMac:string;
    deviceSeq:number;
    deviceType:number;
    deviceData:string;
}
