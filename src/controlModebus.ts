

import * as Net from 'net';//import socket module
import * as DTCMD from './dataTypeCmd';

let fs = require('fs');
let configfilePath = './config.json';

import { ModbusRTU } from './modbusDriver';
import { iDriver, iDevInfo, iReadableRegister, iDripstand, iDevPkg, iRxLightInfo } from './dataTypeModbus';
import { holdingRegisterAddress, holdingRegistersAddress, inputregisterAddress, typesDevice, deviceLength, devAddress, otherDripStandAddress, modbusCmd, webCmd, driverlightType } from './dataTypeModbus';

import * as DTMODBUS from './dataTypeModbus';

import { promises, lstat } from 'fs';
import { resolve } from 'path';

let moment = require('moment');


let timeFunctionInterval: number = 5;
let maxLightIdKeep: number = 62;//max acount of light in a gw loop
let pollingTimeStep: number = 10;//polling time per light
let driverResPonseTimeout=5;
let nextCmdDleayTime=1;
let limitHandshake: number = 3;//max. acount of handshakeing
let scanPeriodSec:number=0.5  ;//sec
let scanPeriodCount:number=scanPeriodSec/0.1;//convert second to counts
let cyclePollingPeriod:number=600;

enum modbusErr {
    errBleDead,
    errLenZero,
    errMsg,
}

enum systemMode {
    none,
    AI_5fft
}

let sysmod=systemMode.AI_5fft;


export class ControlModbus {

    

    modbusClient: Net.Socket;
    modbusServerIP: string;
    modbusServerPort: number;

    masterRs485: ModbusRTU = new ModbusRTU();
    drivers: iDriver[] = [];
    devPkgMember: iDevPkg[] = [];
    devPkgMemberAI: DTMODBUS.iDevPkgAI[] = [];
    pollingTime: number = 1000;

    flagServerStatus: boolean = false;
    flagModbusStatus: boolean = false;

    pollingPositionTimer: NodeJS.Timeout;
    fPollingEn: boolean;
    cmdControlQueue: DTCMD.iCmd[] = [];
    timeRunCmd: number = 10;

    //-------------------------------------------------------------------------------
    constructor() {
        this.process();
    }
    
    getNowTime():string{
        let str:string=moment().format('YYYY-MM-DD hh:mm:ss') 
        return str;
    }

    //-------------------------------------------------------------------------------
    async process() {
        this.startModbusClient();//create modbus client and connect to modbus server

        this.flagModbusStatus = await this.masterRs485.process();//open modbus
        await this.delay(1000);

        if (this.flagServerStatus && this.flagModbusStatus)//server connected and modbus is ready
        {
            console.log('start modbus process');
            this.systemRun();
        }
        else {
            if (this.flagServerStatus == false) {
                console.log('Can not connect to modbus server!');
            }

            if (this.flagModbusStatus == false) {
                console.log('RS485 device is not ready');
            }
        }
    }

    //-----------------------------------------------------------------------
    async startModbusClient() {
        await this.readConfigFile();//read config.json
        this.configureClient();// connect to modbus server
    }
    //----------------------------------------------------------------------------
    readConfigFile(): Promise<any> //read config.json
    {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.modbusServerPort = configJson.scoketModbusServerPort;//get server port
            this.modbusServerIP = configJson.scoketModbusServerIP;//get server ip
            resolve(true);
        });
    }

    //-------------------------------------------------------------------------------
    configureClient() // connect to modbus server
    {

        this.modbusClient = Net.connect(this.modbusServerPort, this.modbusServerIP, () => {
            console.log(`modbusClient connected to: ${this.modbusClient.address} :  ${this.modbusClient.localPort}`);
            this.flagServerStatus = true;
        });

        this.modbusClient.on('end', () => {
            console.log('modbusClient disconnected');
            this.flagServerStatus = false;
        });

        // received server cmd data \
        this.modbusClient.on('data', (data) => {
            let temp: any = data;
            let cmd: DTCMD.iCmd = JSON.parse(temp);
            this.parseControlServerCmd(cmd);
        });
    }

    //-------------------------------------------------------------
    sendModbusMessage2Server(cmd: DTCMD.iCmd)//sent cmd data to server
    {
        this.modbusClient.write(JSON.stringify(cmd));
    }
    //------------------------------------------------------------
    async parseControlServerCmd(cmd: DTCMD.iCmd) {
        let cmdtemp: DTCMD.iCmd = cmd;
        switch (cmd.cmdtype) {

            case webCmd.postReset://reset modbus
                clearInterval(this.pollingPositionTimer);//stop polling
                this.drivers.length = 0;//clear
                this.devPkgMember.length = 0;//clear
                this.flagServerStatus = false;
                this.flagModbusStatus = false;
                this.fPollingEn = false;
                this.modbusClient.destroy();//disconnect
                //this.masterRs485=new ModbusRTU();
                this.delay(1000);
                this.startModbusClient();//create modbus client and connect to modbus server
                // this.systemRun();

                break;

            case webCmd.postDimingBrightness:
                this.cmdControlQueue.push(cmdtemp);//push to queue and wait for execution 
                break;

            case webCmd.postDimingCT:
                this.cmdControlQueue.push(cmdtemp);//push to queue and wait for execution 
                break;

            case webCmd.postDimingXY:
                this.cmdControlQueue.push(cmd);//push to queue and wait for execution 
                break;

            case webCmd.postSwitchOnOff:
                this.cmdControlQueue.push(cmdtemp);//push to queue and wait for execution 
                break;

                case webCmd.postCFMode:
                    this.cmdControlQueue.push(cmdtemp);//push to queue and wait for execution
                    break; 
        }
    }

    //-----------------------------------------------------------------------------
    //run system 
    async systemRun() {
        //get information of drivers on network
        await this.getNetworkLightNumber()
            .then((value) => {
                if (value.length > 0) {
                    this.drivers = value;
                    let cmd: DTCMD.iCmd =
                    {
                        cmdtype: modbusCmd.driverInfo,
                        cmdData: this.drivers
                    }
                    //send driver status to controprocess
                    this.sendModbusMessage2Server(cmd);//sent driver information to server
                }
                else {
                    this.drivers.length = 0;
                    console.log("no device");
                }
            });

        //calculate polling time    
        this.pollingTime = 1050 - this.drivers.length * pollingTimeStep;
        this.fPollingEn = true;//enable polling drivers


        if (this.drivers.length > 0) {

            console.log("first setting ble scan time=" +scanPeriodSec + " second")
            await this.bleScanTime();
            await this.delay(10);
            console.log("second setting ble scan time=" +scanPeriodSec + " second")
            await this.bleScanTime();
            await this.delay(10);
            console.log("Third setting ble scan time=" +scanPeriodSec + " second")
            await this.bleScanTime();
            await this.delay(10);
            
            console.log(this.getNowTime()+' Enable BLE')
            this.masterRs485.modbus_Master.setTimeout(1);
            await this.enBleReceive();
            await this.delay(10);

            console.log(this.getNowTime()+' Enable BLE')
            this.masterRs485.modbus_Master.setTimeout(1);
            await this.enBleReceive();
            await this.delay(10);

            console.log(this.getNowTime()+' Enable BLE')
            this.masterRs485.modbus_Master.setTimeout(1);
            await this.enBleReceive();
            await this.delay(10);

           
            await this.delay(cyclePollingPeriod);
            this.runCmdProcess();//start polling driver and get location data
        }
    }

    //------------------------------------------------------------------------------------
    async runCmdProcess() {

        //this.timeRunCmd=10;
        //check if there is  command in command queue
        if (this.cmdControlQueue.length > 0) {
            await this.exeControlCmd();//execute cmd in queue
            await this.delay(10);
            //update driver infomation
            /* 
                await this.updateExistNetworkLight()
                .then((value) => {
                    if (value.length > 0) {
                        this.drivers = value;
                        let cmd: DTCMD.iCmd =
                        {
                            cmdtype: modbusCmd.driverInfo,
                            cmdData: this.drivers
                        }
                        //send driver status to controprocess
                        this.sendModbusMessage2Server(cmd);//sent driver information to server
                    }
                    else {
                        this.drivers.length = 0;
                        console.log("no device");
                    }
                });
            */
        }

        //if (this.fPollingEn == true)//allow polling
        //{
        



        this.devPkgMember.length = 0;//clear devPkgMember
        this.devPkgMember = [];
       
        this.masterRs485.modbus_Master.setTimeout(this.masterRs485.timeout);
        if(sysmod==systemMode.none)
        { 
            this.devPkgMember.length = 0;//clear devPkgMember
            this.devPkgMember = [];
            await this.pollingLocationInfo();//ask input register location data
        }
        else
        {
            console.log("AI mode")
            this.devPkgMemberAI.length = 0;//clear devPkgMember
            this.devPkgMemberAI = [];
            await this.pollingLocationInfoAI();//ask input register location data
        }
       
        this.timeRunCmd = 10;
        // }
        //console.log(this.getNowTime()+' Enable BLE')
        //this.masterRs485.modbus_Master.setTimeout(1);
        //await this.enBleReceive();
        setTimeout(() => {
            this.runCmdProcess();
        }, cyclePollingPeriod);// this.pollingTime);
    }
    //------------------------------------------------------------------------------------
    async enBleReceive(): Promise<boolean> {
        // for (let i = 0; i < this.drivers.length; i++) {
        //     console.log("enable ble receive of light " + this.drivers[i].lightID);
        //     await this.delay(pollingTimeStep);//delay 5ms
        await this.setBlefBleRxEn(0)//broadcast read device information,get register array,            await this.setBlefBleRxEn(this.drivers[i].lightID)//read device information,get register array
            .then((value) => {
                console.log(value);

            })
            .catch((err) => {
                //console.log(err);
            })
        return new Promise<boolean>((resolve, reject) => {
            resolve(true);
        })


    }
    //------------------------------------------------------------------------------------
    async disableBleReceive() {
        // for (let i = 0; i < this.drivers.length; i++) {
        //     console.log("disable ble receive of light " + this.drivers[i].lightID);
        //     await this.delay(pollingTimeStep);//delay 5ms
        await this.setBlefBleRxEn(0)//read device information,get register array
            .then((value) => {
                console.log(value);
            })
        // }
    }
    //---------------------------------------------------------------------------------------
    //read device register of light
    setBlefBleRxEn(lightID: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.masterRs485.setSlaveID(lightID);
            this.masterRs485.writeSingleRegister(holdingRegisterAddress.fBleRxEn, 1)
                .then((value) => {
                    resolve(value);//return 
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
        //--------------------------------------------------------------------------------------------
        async bleScanTime(): Promise<boolean> {
            // for (let i = 0; i < this.drivers.length; i++) {
            //     console.log("enable ble receive of light " + this.drivers[i].lightID);
            //     await this.delay(pollingTimeStep);//delay 5ms
            await this.setBleScanTime(scanPeriodCount)//broadcast read device information,get register array,            await this.setBlefBleRxEn(this.drivers[i].lightID)//read device information,get register array
                .then((value) => {
                    console.log(value);
    
                })
                .catch((err) => {
                    console.log(err);
                })
            return new Promise<boolean>((resolve, reject) => {
                resolve(true);
            })
        }
            //---------------------------------------------------------------------------------------
    //set ble scan time
    setBleScanTime(period: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.masterRs485.setSlaveID(0);
            this.masterRs485.writeSingleRegister(holdingRegisterAddress.queryTime, period)
                .then((value) => {
                    resolve(value);//return 
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //---------------------------------------------------------------------------------------
    //read device register of light
    setBlefBleRxStop(lightID: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.masterRs485.setSlaveID(lightID);
            this.masterRs485.writeSingleRegister(holdingRegisterAddress.fBleRxEn, 0)
                .then((value) => {
                    resolve(value);//return 
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
    //---------------------------------------------------------------------------------------
    //read device register of light
    setBrightness(lid: number, Brightness: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            console.log(lid);
            this.masterRs485.setSlaveID(lid);
            this.masterRs485.writeSingleRegister(holdingRegisterAddress.brightness, Brightness)
                .then((value) => {
                    resolve(value);//return data length
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }
   //-----------------------------------------------------------------------------------------
   async setAllBrightness( brightness: number): Promise<boolean> {
    let flag: boolean = false;
    //for (let i: number = 0; i < this.drivers.length; i++) {
        //this.masterRs485.setSlaveID(this.drivers[i].lightID);
        this.masterRs485.setSlaveID(0);
        await this.masterRs485.writeSingleRegister(holdingRegisterAddress.brightness ,brightness)
            .then((value) => {
                flag = true;
                console.dir(value);//return data length
            })
            .catch((errMsg) => {
                flag = false;
                console.dir(errMsg);
            })
       // await this.delay(pollingTimeStep);
   // }
    return new Promise<boolean>((resolve, reject) => {
        if (flag == true) {
            resolve(true)
        }
        else {
            reject(false);
        }
    })
}

    //---------------------------------------------------------------------------------------
    async cmdDimBrightness(lid: number, brightness: number) {
        await this.setBrightness(lid, brightness)
            .catch((errormsg) => {
                console.log("error:" + errormsg);
            })
            .then((value) => {
                console.log("value" + value);
            })

    }
    //-----------------------------------------------------------------------------------------
    async setCT_All(ck: number, br: number): Promise<boolean> {
        let flag: boolean = false;
        //for (let i: number = 0; i < this.drivers.length; i++) {
            //this.masterRs485.setSlaveID(this.drivers[i].lightID);
            this.masterRs485.setSlaveID(0);
            await this.masterRs485.writeRegisters(holdingRegistersAddress.ck, [br, ck])
                .then((value) => {
                    flag = true;
                    console.dir(value);//return data length
                })
                .catch((errMsg) => {
                    flag = false;
                    console.dir(errMsg);
                })
            //await this.delay(pollingTimeStep);
       // }
        return new Promise<boolean>((resolve, reject) => {
            if (flag == true) {
                resolve(true)
            }
            else {
                reject(false);
            }
        })
    }
    //-----------------------------------------------------------------------------------------
    async setCT(lightID: number, ck: number, br: number): Promise<number[]> {


        return new Promise<number[]>((resolve, reject) => {

            this.masterRs485.setSlaveID(lightID);
            this.masterRs485.writeRegisters(holdingRegistersAddress.ck, [br, ck])
                .then((value) => {
                    resolve(value);//return data length
                })
                .catch((errMsg) => {
                    reject(errMsg);
                })
        });
    }
    //------------------------------------------------------------------------------------------
    async switchOnOffAll(switchValue: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.masterRs485.setSlaveID(0);
            this.masterRs485.writeSingleRegister(holdingRegisterAddress.onOff, switchValue)
                .then((value) => {
                    resolve(true);//return data length
                })
                .catch((errorMsg) => {
                    reject(errorMsg);
                })
        });
    }

    //------------------------------------------------------------------------------------------
    async switchOnOff(switchValue: number, driverID: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.masterRs485.setSlaveID(driverID);
            this.masterRs485.writeSingleRegister(holdingRegisterAddress.onOff, switchValue)
                .then((value) => {
                    resolve(value);//return data length
                })
                .catch((errMsg) => {
                    reject(errMsg);
                })
        });
    }
   
      //---------------------------------------------------------------------------------------------------
async DimCFAll(cfMode: number,br:number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        this.masterRs485.setSlaveID(0);
        this.masterRs485.writeRegisters(holdingRegisterAddress.cfMode   ,   [cfMode, br])
            .then((value) => {
                resolve(true);//return data length
            })
            .catch((errorMsg) => {
                reject(errorMsg);
            })
    });
}


    //------------------------------------------------------------------------------------------
    async DimCF(cfMode: number, driverID: number,br:number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            this.masterRs485.setSlaveID(driverID);
            this.masterRs485.writeRegisters(holdingRegisterAddress.cfMode,[ cfMode,br])
                .then((value) => {
                    resolve(value);//return data length
                })
                .catch((errMsg) => {
                    reject(errMsg);
                })
        });
    }
    //------------------------------------------------------------------------------------------
    async exeControlCmd(): Promise<boolean> {
        let cmd: DTCMD.iCmd;
        let len: number = this.cmdControlQueue.length;
        let brightID: number;
        let cmdBrightness: number;
        let cmdLightID: number = 0;
        let cmdSwitchOnOffValue: number = 0;
        let ck: number;
        let brightness: number;
        let driver: iDriver;
        let lightType: driverlightType;

        for (let i: number = 0; i < len; i++) {

            //check driver id match cmd driver

            cmd = this.cmdControlQueue[i];
            cmdLightID = cmd.cmdData.driverId;
            //console.dir(cmd.cmdData.driverId);
            if (cmdLightID == 255) {//group control

                switch (cmd.cmdtype) {

                    case webCmd.postDimingBrightness:
                        console.log("dim all brightness")
                        await this.setAllBrightness(cmd.cmdData.brightness)                            
                        .then((value) => {
                            console.log(value);
                        }).catch((reason) => {
                            console.log(reason);
                        })
                    break;


               
                    case webCmd.postDimingCT:
                        console.log("dim all ct");
                        await this.setCT_All(cmd.cmdData.CT, cmd.cmdData.brightness)
                            .then((value) => {
                                console.log(value);
                            }).catch((reason) => {
                                console.log(reason);
                            })

                        break;

                    case webCmd.postDimingXY:
                        //let cmdDimingXY: DTCMD.iColorXY = cmd.cmdData;
                        //this.exeWebCmdPostDimColoXY(cmdDimingXY.brightness, cmdDimingXY.driverID, cmdDimingXY.colorX, cmdDimingXY.colorY);
                        break;

                    case webCmd.postSwitchOnOff:

                        if (cmd.cmdData.switchOnOff) {
                            console.log("switch on all");
                        } else {
                            console.log("switch off all");
                        }

                        await this.switchOnOffAll(cmd.cmdData.switchOnOff)
                            .then((value) => {
                                console.log(value);
                            }).catch((reason) => {
                                console.log(reason);
                            })
                        break;

                        case webCmd.postCFMode:
                            if(cmd.cmdData.cfMode==1)
                            {
                                console.log("All Light High CF ");
                            }
                            else if(cmd.cmdData.cfMode==2)
                            {
                                console.log("All Light Low CF ");
                            }
                            
                            await this.DimCFAll(cmd.cmdData.cfMode, cmd.cmdData.brightness)
                            .then((value) => {
                                console.log(value);
                            }).catch((reason) => {
                                console.log(reason);
                            })
                            
                            break;
                }
            }
            else {
                //Is id exist
                for (let j: number = 0; j < this.drivers.length; j++) {
                    if (cmd.cmdData.driverId == this.drivers[j].lightID) {
                        cmdLightID = this.drivers[j].lightID;
                        break;
                    }
                }

                if (cmdLightID > 0)// driver id match cmd driver
                {
                    switch (cmd.cmdtype) {

                        case webCmd.postDimingBrightness:

                            await this.setBrightness(cmdLightID, cmd.cmdData.brightness)
                                .then((value) => {
                                    console.log(value);
                                }).catch((reason) => {
                                    console.log(reason);
                                })

                            break;

                        case webCmd.postDimingCT:
                            console.log("dim ct " + cmdLightID);
                            await this.setCT(cmdLightID, cmd.cmdData.CT, cmd.cmdData.brightness)
                                .then((value) => {
                                    console.log(value);
                                }).catch((reason) => {
                                    console.log(reason);
                                })
                            break;

                        case webCmd.postDimingXY:
                            //let cmdDimingXY: DTCMD.iColorXY = cmd.cmdData;
                            //this.exeWebCmdPostDimColoXY(cmdDimingXY.brightness, cmdDimingXY.driverID, cmdDimingXY.colorX, cmdDimingXY.colorY);
                            break;

                        case webCmd.postSwitchOnOff:
                            if (cmd.cmdData.switchOnOff) {
                                console.log("switch on driver " + cmdLightID);
                            } else {
                                console.log("switch off driver " + cmdLightID);
                            }
                            await this.switchOnOff(cmd.cmdData.switchOnOff, cmdLightID)
                                .then((value) => {
                                    console.log(value);
                                }).catch((reason) => {
                                    console.log(reason);
                                })
                            break;

                            case webCmd.postCFMode:
                                if(cmd.cmdData.cfMode==1)
                                {
                                    console.log(" Dim Light" +cmdLightID+" High CF ");
                                }
                                else if(cmd.cmdData.cfMode==2)
                                {
                                    console.log(" Dim Light" +cmdLightID+" Low CF ");
                                }

                                await this.DimCF(cmd.cmdData.cfMode,cmdLightID, cmd.cmdData.brightness)
                                .then((value) => {
                                    console.log(value);
                                }).catch((reason) => {
                                    console.log(reason);
                                })
                                
                                break;
                    }
                }

            }






        }


        //remove cmd in queue

        for (let i: number = 0; i < len; i++) {
            this.cmdControlQueue.shift();//remove first item
        }
        this.cmdControlQueue.length = 0;


        return new Promise<boolean>((resolve, reject) => {
            resolve(true);
        })

    }
    //-------------------------------------------------------------------------------------
    async pollingLocationInfo(): Promise<boolean> {
        console.log(this.getNowTime()+' Polling Network.');
        for (let i = 0; i < this.drivers.length; i++) {

            await this.delay(pollingTimeStep);//delay 5ms
            await this.readDevicePosition(this.drivers[i].lightID)//read device information,get register array
                .then((value) => {
                    //console.dir(value)
                    //parse array and sort device
                    this.sortDeviceTable(this.drivers[i].lightID, value);//get sort of device package array,devPkgMember
                })
                .catch((err) => {
                    if (err == modbusErr.errBleDead) {
                        console.log(this.getNowTime()+' Ble Is Dead!');
                    }
                    else if (err != modbusErr.errLenZero) {
                        console.log(err);
                    }

                    //console.log(err);//print error/len=0/ble is dead
                })
        }


        return new Promise<boolean>((resolve, reject) => {

            if (this.devPkgMember.length > 0) {
                //write to server
                let cmd: DTCMD.iCmd =
                {
                    cmdtype: modbusCmd.location,
                    cmdData: this.devPkgMember
                }
                //send location information to controlprocess

                this.sendModbusMessage2Server(cmd);//sent device package to server 
                this.devPkgMember.forEach(item => {
                    //console.dir(item);
                });

                resolve(true);
            }
            else {
                resolve(false);
            }

        })

    }
//-------------------------------------------------------------------------------------
async pollingLocationInfoAI(): Promise<boolean> {
    console.log(this.getNowTime()+' Polling Network.');
    for (let i = 0; i < this.drivers.length; i++) {

        await this.delay(pollingTimeStep);//delay 5ms
        await this.readDevicePosition(this.drivers[i].lightID)//read device information,get register array
            .then((value) => {
                //console.log("data")
                //console.dir(value)
                //parse array and sort device
                this.sortDeviceTableAI(this.drivers[i].lightID, value);//get sort of device package array,devPkgMember
            })
            .catch((err) => {
                if (err == modbusErr.errBleDead) {
                    console.log(this.getNowTime()+' Ble Is Dead!');
                }
                else if (err != modbusErr.errLenZero) {
                    console.log(err);
                }

                //console.log(err);//print error/len=0/ble is dead
            })
    }


    return new Promise<boolean>((resolve, reject) => {

        if (this.devPkgMemberAI.length > 0) {
            //write to server
            let cmd: DTCMD.iCmd =
            {
                cmdtype: modbusCmd.location,
                cmdData: this.devPkgMemberAI
            }
            //send location information to controlprocess

            this.sendModbusMessage2Server(cmd);//sent device package to server 
            this.devPkgMemberAI.forEach(item => {
                console.dir(item);
            });

            resolve(true);
        }
        else {
            resolve(false);
        }

    })

}
    //----------------------------------------------------------------------------------
    //read readable  number of register
    getReadableNumber(id: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            let len: number;
            this.masterRs485.setSlaveID(id);
            let readCount: number = 1;

            this.masterRs485.readInputRegisters(inputregisterAddress.countReadableRegister, readCount)
                .then((value) => {

                    len = value[0];//record data length
                    if (len >= 0) {
                        // console.log("len="+len)
                        resolve(len);//return data length
                    }
                    else {
                        reject(modbusErr.errLenZero);
                    }

                })
                .catch((errorMsg) => {

                    // console.log("len get error=" + errorMsg);
                    reject(errorMsg);
                })
        });
    }
    //--------------------------------------------------------------------------
    //read registers of light
    getDevicRegisterData(id: number, lenRegister: number): Promise<number[]> {
        this.masterRs485.setSlaveID(id);
        let arrayDevicRegister: number[] = [];
        return new Promise<number[]>((resolve, reject) => {
            let startRegisterAddress: number = inputregisterAddress.g0Device000;
            //console.log('lenRegister='+lenRegister)
            this.masterRs485.readInputRegisters(startRegisterAddress, lenRegister)
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
    //------------------------------------------------------------------------
    //read device register of light
    async readDevicePosition(lightID: number): Promise<number[]> {
        let registerLen: number;
        return new Promise<number[]>((resolve, reject) => {
            //read length
            this.getReadableNumber(lightID)
                .then((value) => {//get byte length
                    console.log('len='+value)
                    
                    if ((value > 0) && (value < 255))//length>0
                    {
                        registerLen = value / 2;//register length=byte length /2
                      
                       // setTimeout(() => {
                            //read device location data after timeFunctionInterval,return register array
                            this.getDevicRegisterData(lightID, registerLen)
                                .then((value) => {
                                    //console.log('val')
                                    //console.log(value)
                                    resolve(value);
                                })
                                .catch((errorMsg) => {
                                    
                                    reject(errorMsg);
                                })
                       // }, 10);//timeFunctionInterval

                    }
                    else {
                        if (value == 0) {
                            reject(modbusErr.errLenZero);
                        }
                        else {
                            reject(modbusErr.errBleDead);
                        }

                        //     
                    }

                })
                .catch((errorMsg) => {

                    reject(errorMsg);
                })
        });
    }
    //-------------------------------------------------------------------
    //get exist light driver on the network
    async getNetworkLightNumber(): Promise<iDriver[]> {
        let driversKeep: iDriver[] = [];
        let id = 0;
        let handshakeCount: number = 0;
        let flagFounddDriver:boolean=false;
        for (let i: number = 0; i < maxLightIdKeep; i++) {
            id += 1;
            for (let j: number = 1; j <= limitHandshake; j++) {
                if (j == 1) {
                    console.log('Searching driver ' + id.toString() + ' ' + j.toString() + ' time');
                }
                else {
                    console.log('Searching driver ' + id.toString() + ' ' + j.toString() + ' times');
                }

                await this.getLightInformation(id)
                    .then((value) => {//value is driverInfo
                        console.log('Driver ' + id.toString() + ' was found' );
                        flagFounddDriver=true;
                        driversKeep.push(value);//save driver
                        
                    })
                    .catch((errorMsg) => {
                        console.log('Driver ' + id + ' response error : ' + errorMsg);
                        flagFounddDriver=false;
                    });
                
                if(flagFounddDriver)
                {
                    flagFounddDriver=false;
                    break;//jump out for loop and find next driver
                }
                else
                {
                    if(j >= limitHandshake)
                    {
                        break;//jump out for loop and find next driver
                    }
                    await this.delay(nextCmdDleayTime);//read next light after 5msec
                }   
            }
        }

        return new Promise<iDriver[]>((resolve, reject) => {
            resolve(driversKeep);
        });
    }
    //-------------------------------------------------------------------
    //update exist light driver on the network
    async updateExistNetworkLight(): Promise<iDriver[]> {
        let driversKeep: iDriver[] = [];
        let id: number = 0;
        let driverIDs: number[] = [];
        let handshakeCount: number = 0;
        let flagFounddDriver:boolean=false;
        //backup driver ID
        this.drivers.forEach(driver => {
            driverIDs.push(driver.lightID);
        });
        for (let i: number = 0; i < driverIDs.length; i++) {
            id = driverIDs[i];
            console.log('*Start query Light : ' + id.toString());
            for (let j: number = 1; j <= limitHandshake; j++) {
                if (j == 1) {
                    console.log('Searching driver ' + id.toString() + ' ' + j.toString() + ' time');
                }
                else {
                    console.log('Searching driver ' + id.toString() + ' ' + j.toString() + ' times');
                }

                await this.getLightInformation(id)
                    .then((value) => {//value is driverInfo
                        console.log('Driver ' + id.toString() + ' was found' );
                        flagFounddDriver=true;
                        driversKeep.push(value);//save driver
                        
                    })
                    .catch((errorMsg) => {
                        console.log('Driver ' + id + ' response error : ' + errorMsg);
                        flagFounddDriver=false;
                    });
                
                if(flagFounddDriver)
                {
                    flagFounddDriver=false;
                    break;//jump out for loop and find next driver
                }
                else
                {
                    if(j >= limitHandshake)
                    {
                        break;//jump out for loop and find next driver
                    }
                    await this.delay(nextCmdDleayTime);//read next light after 5msec
                }   
            }
        }

        return new Promise<iDriver[]>((resolve, reject) => {
            resolve(driversKeep);
        });
    }
    //-------------------------------------------------------------------
    //get light driver information
    getLightInformation(id: number): Promise<iDriver> {
        return new Promise<iDriver>((resolve, reject) => {
            let driverInfo: iDriver = {};
            this.masterRs485.setSlaveID(id);
            let readCount: number = inputregisterAddress.manufactureID + 1;//read 7 register

            //read 7 register from version
            this.masterRs485.readInputRegisters(inputregisterAddress.version, readCount)
                .then((value) => {
                    //console.log(value);
                    driverInfo.version = value[inputregisterAddress.version];
                    driverInfo.lightID = value[inputregisterAddress.lightID];
                    driverInfo.lightType = value[inputregisterAddress.lightType];
                    driverInfo.Mac = value[inputregisterAddress.lightMacH].toString(16) + value[inputregisterAddress.lightMacM].toString(16) + value[inputregisterAddress.lightMacL].toString(16);
                    driverInfo.manufactureID = value[inputregisterAddress.manufactureID];
                    readCount = holdingRegisterAddress.onOff + 1;

                    //after 5ms ,read holding register
                    setTimeout(() => {
                        this.masterRs485.readHoldingRegisters(holdingRegisterAddress.brightness, readCount)
                            .then(value => {
                                driverInfo.brightness = value[holdingRegisterAddress.brightness];
                                driverInfo.ck = value[holdingRegisterAddress.ck];
                                driverInfo.brightnessMin = value[holdingRegisterAddress.brightnessMin];
                                driverInfo.brightnessMax = value[holdingRegisterAddress.brightnessMax];
                                driverInfo.ckMin = value[holdingRegisterAddress.ckMin];
                                driverInfo.ckMax = value[holdingRegisterAddress.ckMax];
                                driverInfo.bleEnable = value[holdingRegisterAddress.fBleRxEn];
                                driverInfo.onOff = value[holdingRegisterAddress.onOff];
                                resolve(driverInfo);
                            })
                            .catch((errorMsg) => {
                                reject(errorMsg);
                            })
                    }, driverResPonseTimeout);
                })
                .catch((errorMsg) => { //timeout
                    reject(errorMsg);//error
                })
        });
    }
    //----------------------------------------------------------------------------------------
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
            end = start + len;
            let partOfArry: Uint8Array = u8.subarray(start, end);
            matix.push(partOfArry);
            start = end;
        }
        return matix;
    }
    //----------------------------------------------------------------------------------------
    //number array to uint8  array matrix
    getNumber2Uint8MatrixAI(num: number[]): Uint8Array[] {
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
                len = DTMODBUS.deviceLengthAI.tagLen;
            }
            else if (u8[start] == typesDevice.dripStand) {
                len = DTMODBUS.deviceLengthAI.dripStandLen;
            }
            else {
                break;
            }
            end = start + len;
            let partOfArry: Uint8Array = u8.subarray(start, end);
            matix.push(partOfArry);
            start = end;
        }
        return matix;
    }

    //-----------------------------------------------------------------------------
    //2 bytes to number
    byte2Number(hbyte: number, lbyte: number): number {
        let num: number = hbyte * 256 + lbyte;
        return num;
    }
    //-----------------------------------------------------------------------------
    //get device content
    paserProtocol2Dev(recLightID: number, u8: Uint8Array): iDevInfo {

        let dev: iDevInfo = {};
        dev.type = u8[devAddress.type];
        dev.seq = u8[devAddress.seq];
        dev.mac = '';
        for (let i: number = 5; i >= 0; i--) {
            if (u8[devAddress.Mac + i] < 10) {
                dev.mac += "0" + u8[devAddress.Mac + i].toString(16);
            }
            else {
                dev.mac += u8[devAddress.Mac + i].toString(16);
            }
            if (i != 0) {
                dev.mac += ":";
            }

        }
        dev.lId1 = u8[devAddress.lId1];
        dev.lId2 = u8[devAddress.lId2];
        dev.br1 = this.byte2Number(u8[devAddress.br1 + 1], u8[devAddress.br1]);
        dev.br2 = this.byte2Number(u8[devAddress.br2 + 1], u8[devAddress.br2]);
        dev.rssi = -1 * this.byte2Number(u8[devAddress.rssi + 1], u8[devAddress.rssi]);
        dev.Gx = u8[devAddress.Gx];
        dev.Gy = u8[devAddress.Gy];
        dev.Gz = u8[devAddress.Gz];
        dev.batPow = u8[devAddress.batPow];
        dev.labelX = u8[devAddress.labelX];
        dev.labelY = u8[devAddress.labelY];
        dev.labelH = this.byte2Number(u8[devAddress.labelH + 1], u8[devAddress.labelH]);
        dev.recLightID = recLightID;
        switch (u8[0]) {
            case typesDevice.tag:
                dev.other = {};
                break;

            case typesDevice.dripStand:
                let other: iDripstand = {};
                other.weight = this.byte2Number(u8[otherDripStandAddress.weight + 1], u8[otherDripStandAddress.weight]);
                other.speed = u8[otherDripStandAddress.speed];// this.byte2Number(u8[otherDripStandAddress.speed + 1], u8[otherDripStandAddress.speed]);
                other.time = this.byte2Number(u8[otherDripStandAddress.time + 1], u8[otherDripStandAddress.time]);
                dev.other = other;
                break;
        }
        console.log("get package:")
        console.log(dev)
        return dev;
    }
    //--------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------
    //get device content
    paserProtocol2DevAI(recLightID: number, u8: Uint8Array): iDevInfo {

        let dev: DTMODBUS.iDevInfoAI = {};
        dev.type = u8[DTMODBUS.devAddressAI.type];
        dev.seq = u8[DTMODBUS.devAddressAI.seq];
        dev.mac = '';
        for (let i: number = 5; i >= 0; i--) {
            if (u8[DTMODBUS.devAddressAI.Mac + i] < 10) {
                dev.mac += "0" + u8[DTMODBUS.devAddressAI.Mac + i].toString(16);
            }
            else {
                dev.mac += u8[DTMODBUS.devAddressAI.Mac + i].toString(16);
            }
            if (i != 0) {
                dev.mac += ":";
            }

        }
        dev.lid1 = u8[DTMODBUS.devAddressAI.lid1];
        dev.lid2 = u8[DTMODBUS.devAddressAI.lid2];
        dev.lid3 = u8[DTMODBUS.devAddressAI.lid3];
        dev.lid4 = u8[DTMODBUS.devAddressAI.lid4];
        dev.lid5 = u8[DTMODBUS.devAddressAI.lid5];
        dev.br1 = this.byte2Number(u8[DTMODBUS.devAddressAI.br1 + 1], u8[DTMODBUS.devAddressAI.br1]);
        dev.br2 = this.byte2Number(u8[DTMODBUS.devAddressAI.br2 + 1], u8[DTMODBUS.devAddressAI.br2]);
        dev.br3 = this.byte2Number(u8[DTMODBUS.devAddressAI.br3 + 1], u8[DTMODBUS.devAddressAI.br3]);
        dev.br4 = this.byte2Number(u8[DTMODBUS.devAddressAI.br4 + 1], u8[DTMODBUS.devAddressAI.br4]);
        dev.br5 = this.byte2Number(u8[DTMODBUS.devAddressAI.br5 + 1], u8[DTMODBUS.devAddressAI.br5]);
        dev.rssi = -1 * this.byte2Number(u8[DTMODBUS.devAddressAI.rssi + 1], u8[DTMODBUS.devAddressAI.rssi]);
        dev.batPow = u8[devAddress.batPow];
        dev.label = u8[DTMODBUS.devAddressAI.label];
        dev.recLightID = recLightID;

        switch (u8[0]) {
            case typesDevice.tag:
                dev.other = {};
                break;

            case typesDevice.dripStand:
                let other: iDripstand = {};
                other.weight = this.byte2Number(u8[otherDripStandAddress.weight + 1], u8[otherDripStandAddress.weight]);
                other.speed = u8[otherDripStandAddress.speed];// this.byte2Number(u8[otherDripStandAddress.speed + 1], u8[otherDripStandAddress.speed]);
                other.time = this.byte2Number(u8[otherDripStandAddress.time + 1], u8[otherDripStandAddress.time]);
                dev.other = other;
                break;
        }
        return dev;
    }

    //--------------------------------------------------------------------------------------------------
    //group device by device mac
    sortDev(dev: iDevInfo) {
        let isContainDevice: boolean = false;
        if (this.devPkgMember.length > 0) //devPkgMember is not empty
        {
            for (let i: number = 0; i < this.devPkgMember.length; i++) {
                if (this.devPkgMember[i].mac == dev.mac) //does devPkgMember contain device?
                {
                    if (dev.seq == this.devPkgMember[i].seq)//seq is the same
                    {
                        this.devPkgMember[i].rxLightCount += 1;
                        this.devPkgMember[i].rxLightInfo.push({ recLightID: dev.recLightID, rssi: dev.rssi });//save rxLightInfo of device into deviceInfoArry
                        isContainDevice = true;//mark 
                        break;//break the loop
                    }
                    else if ((dev.seq > this.devPkgMember[i].seq))//dev.seq is laster than this.devPkgMember[i].seq
                    {
                        //update laster device information
                        this.devPkgMember[i].lId1 = dev.lId1;
                        this.devPkgMember[i].lId2 = dev.lId2;
                        this.devPkgMember[i].seq = dev.seq;
                        this.devPkgMember[i].mac = dev.mac;
                        this.devPkgMember[i].br1 = dev.br1;
                        this.devPkgMember[i].br2 = dev.br2;
                        this.devPkgMember[i].Gx = dev.Gx;
                        this.devPkgMember[i].Gy = dev.Gy;
                        this.devPkgMember[i].Gz = dev.Gz;
                        this.devPkgMember[i].batPow = dev.batPow;
                        this.devPkgMember[i].labelX = dev.labelX;
                        this.devPkgMember[i].labelY = dev.labelY;
                        this.devPkgMember[i].labelH = dev.labelH;
                        this.devPkgMember[i].other = dev.other;
                        this.devPkgMember[i].rxLightCount = 1;
                        this.devPkgMember[i].rxLightInfo = [];
                        this.devPkgMember[i].rxLightInfo.length = 0;//clear former older information of rxLightInfo
                        this.devPkgMember[i].rxLightInfo.push({ recLightID: dev.recLightID, rssi: dev.rssi }); //update laster rxLightInfo
                        isContainDevice = true;//mark 
                        break;//break the loop
                    }
                    else {
                        if ((this.devPkgMember[i].seq - dev.seq) > 200) {
                            //update laster device information
                            this.devPkgMember[i].lId1 = dev.lId1;
                            this.devPkgMember[i].lId2 = dev.lId2;
                            this.devPkgMember[i].seq = dev.seq;
                            this.devPkgMember[i].mac = dev.mac;
                            this.devPkgMember[i].br1 = dev.br1;
                            this.devPkgMember[i].br2 = dev.br2;
                            this.devPkgMember[i].Gx = dev.Gx;
                            this.devPkgMember[i].Gy = dev.Gy;
                            this.devPkgMember[i].Gz = dev.Gz;
                            this.devPkgMember[i].batPow = dev.batPow;
                            this.devPkgMember[i].labelX = dev.labelX;
                            this.devPkgMember[i].labelY = dev.labelY;
                            this.devPkgMember[i].labelH = dev.labelH;
                            this.devPkgMember[i].other = dev.other;
                            this.devPkgMember[i].rxLightCount = 1;
                            this.devPkgMember[i].rxLightInfo = [];
                            this.devPkgMember[i].rxLightInfo.length = 0;//clear former older information of rxLightInfo
                            this.devPkgMember[i].rxLightInfo.push({ recLightID: dev.recLightID, rssi: dev.rssi }); //update laster rxLightInfo
                            isContainDevice = true;//mark 
                            break;//break the loop
                        }
                    }
                }
            }

            if (isContainDevice == false) //devPkgMember does not contain device
            {
                let devPkg: iDevPkg = {};
                devPkg.type = dev.type;
                devPkg.seq = dev.seq;
                devPkg.mac = dev.mac;
                devPkg.lId1 = dev.lId1;
                devPkg.lId2 = dev.lId2;
                devPkg.br1 = dev.br1;
                devPkg.br2 = dev.br2;
                devPkg.Gx = dev.Gx;
                devPkg.Gy = dev.Gy;
                devPkg.Gz = dev.Gz;
                devPkg.batPow = dev.batPow;
                devPkg.labelX = dev.labelX;
                devPkg.labelY = dev.labelY;
                devPkg.labelH = dev.labelH;
                devPkg.other = dev.other;
                devPkg.rxLightCount = 1;
                devPkg.rxLightInfo = [];
                let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
                devPkg.rxLightInfo.push(rxLightInfo);
                this.devPkgMember.push(devPkg);//save devPkg into devPkgMember
            }
        }
        else   //devPkgMember is empty, 
        {
            let devPkg: iDevPkg = {};
            devPkg.type = dev.type;
            devPkg.seq = dev.seq;
            devPkg.mac = dev.mac;
            devPkg.lId1 = dev.lId1;
            devPkg.lId2 = dev.lId2;
            devPkg.br1 = dev.br1;
            devPkg.br2 = dev.br2;
            devPkg.Gx = dev.Gx;
            devPkg.Gy = dev.Gy;
            devPkg.Gz = dev.Gz;
            devPkg.batPow = dev.batPow;
            devPkg.labelX = dev.labelX;
            devPkg.labelY = dev.labelY;
            devPkg.labelH = dev.labelH;
            devPkg.other = dev.other;
            devPkg.rxLightCount = 1;
            devPkg.rxLightInfo = [];
            let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
            devPkg.rxLightInfo.push(rxLightInfo);
            this.devPkgMember.push(devPkg);//save devPkg into devPkgMember
        }
    }
    //----------------------------------------------------------------------------------
       //group device by device mac
       sortDevAI(dev: DTMODBUS.iDevInfoAI) {
        let isContainDevice: boolean = false;
        if (this.devPkgMemberAI.length > 0) //devPkgMember is not empty
        {
            for (let i: number = 0; i < this.devPkgMemberAI.length; i++) {
                if (this.devPkgMemberAI[i].mac == dev.mac) //does devPkgMember contain device?
                {
                    isContainDevice = true;//mark
                    if (dev.seq == this.devPkgMemberAI[i].seq)//seq is the same
                    {
                        this.devPkgMemberAI[i].rxLightCount += 1;
                        this.devPkgMemberAI[i].rxLightInfo.push({ recLightID: dev.recLightID, rssi: dev.rssi });//save rxLightInfo of device into deviceInfoArry 
                        break;//break the loop
                    }
                    else if ((dev.seq > this.devPkgMemberAI[i].seq))//dev.seq is laster than this.devPkgMember[i].seq
                    {
                        //update laster device information
                        this.devPkgMemberAI[i].seq = dev.seq;
                        this.devPkgMemberAI[i].mac = dev.mac;
                        this.devPkgMemberAI[i].lid1 = dev.lid1;
                        this.devPkgMemberAI[i].lid2 = dev.lid2;
                        this.devPkgMemberAI[i].lid3 = dev.lid3;
                        this.devPkgMemberAI[i].lid4 = dev.lid4;
                        this.devPkgMemberAI[i].lid5 = dev.lid5;
                        this.devPkgMemberAI[i].br1 = dev.br1;
                        this.devPkgMemberAI[i].br2 = dev.br2;
                        this.devPkgMemberAI[i].br3 = dev.br3;
                        this.devPkgMemberAI[i].br4 = dev.br4;
                        this.devPkgMemberAI[i].br5 = dev.br5;
                        this.devPkgMemberAI[i].batPow = dev.batPow;
                        this.devPkgMemberAI[i].label = dev.label;
                        this.devPkgMemberAI[i].other = dev.other;
                        this.devPkgMemberAI[i].rxLightCount = 1;
                        this.devPkgMemberAI[i].rxLightInfo = [];
                        this.devPkgMemberAI[i].rxLightInfo.length = 0;//clear former older information of rxLightInfo
                        this.devPkgMemberAI[i].rxLightInfo.push({ recLightID: dev.recLightID, rssi: dev.rssi }); //update laster rxLightInfo
                        break;//break the loop
                    }
                    else if ((this.devPkgMemberAI[i].seq - dev.seq) > 250) {
                        //update laster device information
                        this.devPkgMemberAI[i].seq = dev.seq;
                        this.devPkgMemberAI[i].mac = dev.mac;
                        this.devPkgMemberAI[i].lid1 = dev.lid1;
                        this.devPkgMemberAI[i].lid2 = dev.lid2;
                        this.devPkgMemberAI[i].lid3 = dev.lid3;
                        this.devPkgMemberAI[i].lid4 = dev.lid4;
                        this.devPkgMemberAI[i].lid5 = dev.lid5;
                        this.devPkgMemberAI[i].br1 = dev.br1;
                        this.devPkgMemberAI[i].br2 = dev.br2;
                        this.devPkgMemberAI[i].br3 = dev.br3;
                        this.devPkgMemberAI[i].br4 = dev.br4;
                        this.devPkgMemberAI[i].br5 = dev.br5;
                        this.devPkgMemberAI[i].batPow = dev.batPow;
                        this.devPkgMemberAI[i].label = dev.label;
                        this.devPkgMemberAI[i].other = dev.other;
                        this.devPkgMemberAI[i].rxLightCount = 1;
                        this.devPkgMemberAI[i].rxLightInfo = [];
                        this.devPkgMemberAI[i].rxLightInfo.length = 0;//clear former older information of rxLightInfo
                        this.devPkgMemberAI[i].rxLightInfo.push({ recLightID: dev.recLightID, rssi: dev.rssi }); //update laster rxLightInfo 
                        break;//break the loop
                    }
                  

                }
            }

            if (isContainDevice == false) //devPkgMember does not contain device
            {
                let devPkg: DTMODBUS.iDevPkgAI = {};
                devPkg.type = dev.type;
                devPkg.seq = dev.seq;
                devPkg.mac = dev.mac;
                devPkg.lid1 = dev.lid1;
                devPkg.lid2 = dev.lid2;
                devPkg.lid3 = dev.lid3;
                devPkg.lid4 = dev.lid4;
                devPkg.lid5 = dev.lid5;
                devPkg.br1 = dev.br1;
                devPkg.br2 = dev.br2;
                devPkg.br3 = dev.br3;
                devPkg.br4 = dev.br4;
                devPkg.br5 = dev.br5;
                devPkg.batPow = dev.batPow;
                devPkg.label = dev.label;
                devPkg.other = dev.other;
                devPkg.batPow = dev.batPow;
                devPkg.other = dev.other;
                devPkg.rxLightCount = 1;
                devPkg.rxLightInfo = [];
                let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
                devPkg.rxLightInfo.push(rxLightInfo);
                this.devPkgMemberAI.push(devPkg);//save devPkg into devPkgMember
            }
        }
        else   //devPkgMember is empty, 
        {
            let devPkg: DTMODBUS.iDevPkgAI = {};
            devPkg.type = dev.type;
            devPkg.seq = dev.seq;
            devPkg.mac = dev.mac;
            devPkg.lid1 = dev.lid1;
            devPkg.lid2 = dev.lid2;
            devPkg.lid3 = dev.lid3;
            devPkg.lid4 = dev.lid4;
            devPkg.lid5 = dev.lid5;
            devPkg.br1 = dev.br1;
            devPkg.br2 = dev.br2;
            devPkg.br3 = dev.br3;
            devPkg.br4 = dev.br4;
            devPkg.br5 = dev.br5;
            devPkg.batPow = dev.batPow;
            devPkg.label = dev.label;
            devPkg.other = dev.other;
            devPkg.rxLightCount = 1;
            devPkg.rxLightInfo = [];
            let rxLightInfo: iRxLightInfo = { recLightID: dev.recLightID, rssi: dev.rssi };
            devPkg.rxLightInfo.push(rxLightInfo);
            this.devPkgMemberAI.push(devPkg);//save devPkg into devPkgMember
        }
    }
    //----------------------------------------------------------------------------------
    //get device table
    sortDeviceTable(recLightID: number, num: number[]) {
        //let devInfo: iDevInfo[] = [];
        let matrix: Uint8Array[] = this.getNumber2Uint8Matrix(num);//convert number to byte
        matrix.forEach(item => {
            let dev: iDevInfo = this.paserProtocol2Dev(recLightID, item);//parse device information
            //console.dir(dev)
            this.sortDev(dev);//sort dev by mac
        });
    }
        //----------------------------------------------------------------------------------
    //get device table
    sortDeviceTableAI(recLightID: number, num: number[]) {
        //let devInfo: iDevInfo[] = [];
        // console.dir(num)
        let matrix: Uint8Array[] = this.getNumber2Uint8MatrixAI(num);//convert number to byte
       
        matrix.forEach(item => {
            let dev: DTMODBUS.iDevInfoAI = this.paserProtocol2DevAI(recLightID, item);//parse device information
           
            this.sortDevAI(dev);//sort dev by mac
        });
    }
    //-------------------------------------------------------------------------------
    //delay function
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }
}


let modebusControl: ControlModbus = new ControlModbus();