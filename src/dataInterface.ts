//import * as mongoose from 'mongoose';

export interface iTag {
    RSSI:number,
    seqID:number,
    type:number,
    deviceMAC:Buffer,
    lightID1:number,
    brightness1:number,
    lightID2:number,
    brightness2:number,  
    G_X: number,
    G_Y: number,
    G_Z: number,
    Battery: number,
    PositionID: number,
    Hight: number
}

export interface iDripStand {
    RSSI:number,
    seqID:number,
    type:number,
    deviceMAC:Buffer,
    lightID1:number,
    brightness1:number,
    lightID2:number,
    brightness2:number, 
    G_X: number,
    G_Y: number,
    G_Z: number,
    Battery: number,
    RemWeight: number,
    DripSpeed: number,
    RemTime: number,
    PositionID: number,
    Hight: number
}


export interface iRS485Driver
{
    DriverID:number,
    DriverIPV6:string,
    DriverMAC:string,
    DateTime:string,
    DriverType:number,
    Brightness:number,
    ColorTemperature:number,
    ColorX:number,
    ColorY:number,
    Power:number,
    Status:number,
    DeviceMemberCount:number,
    DeviceMember:any[]
}


export interface iGateway {
    GatewaySeq:number,
    GatewayIP: String,
    GatewayMAC: String,
    Datetime:string,
    DriverCount: number,
    DriverMember: iRS485Driver[]//array
}

export interface iGatewayPackage{
    GatewaySeqMin:number
    GatewaySeqMax:number
    DateTimeMin:string,
    DateTimeMax:string,
    GatewayHistoryCount:number,
    GatewayHistoryMember:iGateway[]
}


export interface iRS485DriverExistRaw
{
    lightID:number,
    status:number,
    type:number,
    IEEE_BLE_MAC:Buffer,
    brightness:number,
    temperature:number,
    colorX:number,
    colorY:number,
    dataLen:number,
    dataBuf:Buffer
}

export interface iRS485TxCmd
{
    preamble:number,
    seqID:number,
    lightID:number,
    cmdType:number,
}

export interface iRS485TxCmdQueryLightExist
{
    preamble:number,
    lightID:number,
    seqID:number,
    cmdType:number
}

export interface iRS485RxCmdQueryLightExist
{
    lightID:number,
    seqID:number,
    status:number,
    type:number,
    IEEE_BLE_MAC:Buffer
}

export interface iRS485TxCmdDimmingLight
{
    preamble:number,
    lightID:number,
    seqID:number,
    cmdType:number
    brightness:number,
    temperature:number,
    colorX:number,
    colorY:number
}

export interface iRS485RxCmdCmdDimmingLight
{
    preamble:number,
    lightID:number,
    seqID:number,
    status:number
}


export interface iRS485TxCmdQueryVLCContent
{
    preamble:number,
    lightID:number,
    seqID:number,
    cmdType:number
}

export interface iRS485RxCmdQueryVLCContent
{
    preamble:number,
    lightID:number,
    seqID:number,
    status:number,
    dataLen:number,
    dataBuffer:Buffer
}


export interface iGatewayMongo{
    DbSaveTime: Date,
    GatewayTimmingHr: number,
    GatewayTimmingMin: number,
    GatewayTimmingSec: number,
    Gatewaydata: string
}