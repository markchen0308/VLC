"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketWebServer_1 = require("./socketWebServer");
const socketModbusServer_1 = require("./socketModbusServer");
const network = require("network");
const pgControl_1 = require("./pgControl");
const dataTypeModbus_1 = require("./dataTypeModbus");
let saveDatabasePeriod = 6000; //60 sec
let MaxDataQueueLength = 3;
var replyType;
(function (replyType) {
    replyType[replyType["failID"] = 0] = "failID";
    replyType[replyType["failBrightness"] = 1] = "failBrightness";
    replyType[replyType["failCT"] = 2] = "failCT";
    replyType[replyType["failSwitchOnOFF"] = 3] = "failSwitchOnOFF";
    replyType[replyType["failXY"] = 4] = "failXY";
    replyType[replyType["failNoDriver"] = 5] = "failNoDriver";
    replyType[replyType["okBrightness"] = 6] = "okBrightness";
    replyType[replyType["okCT"] = 7] = "okCT";
    replyType[replyType["okSwitchOnOFF"] = 8] = "okSwitchOnOFF";
    replyType[replyType["okXY"] = 9] = "okXY";
    replyType[replyType["okReset"] = 10] = "okReset";
    replyType[replyType["okQueryLocation"] = 11] = "okQueryLocation";
})(replyType || (replyType = {}));
class ControlProcess {
    constructor() {
        this.webServer = new socketWebServer_1.SocketWebServer();
        this.modbusServer = new socketModbusServer_1.SocketModbusServer();
        this.pgCntrol = new pgControl_1.PgControl();
        this.drivers = [];
        this.gwSeq = 0;
        this.GatewayHistoryMember = [];
        this.latestNGwInf = []; //save the lastest 3 gwinf in memory
        this.startProcess();
    }
    async startProcess() {
        await this.getNetworkInformation().
            then(() => {
            console.log('the gateway IP:' + this.GwIP);
            console.log('the gateway MAC:' + this.GwMAC);
        })
            .catch(() => {
            console.log('the network error');
        });
        await this.delay(1000); //delay 100 msecond
        this.listenWebserver(); //start listen webserver
        this.listenModbusServer(); //start listen modbus server
        this.savingProcess(); //save history data
        //this.webtest();//test webserver
    }
    //-----------------------------------------------------------------------------------------------------------
    listenWebserver() {
        this.webServer.socketWebserver.on("connection", (socket) => {
            this.webServer.socket = socket;
            let clientName = `${this.webServer.socket.remoteAddress}:${this.webServer.socket.remotePort}`;
            console.log("connection from " + clientName);
            this.webServer.socket.on('data', (data) => {
                let cmd = JSON.parse(data);
                this.parseWebCmd(cmd); //parse cmd and execute cmd
            });
            this.webServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });
            this.webServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }
    //-----------------------------------------------------------------------------------------------------------------
    async listenModbusServer() {
        this.modbusServer.socketModbusServer.on("connection", (socket) => {
            this.modbusServer.socket = socket;
            let clientName = `${this.modbusServer.socket.remoteAddress}:${this.modbusServer.socket.remotePort}`;
            console.log("connection from " + clientName);
            //get data from modbus
            this.modbusServer.socket.on('data', (data) => {
                let cmd = JSON.parse(data); //parse JSON data
                this.parseModbusCmd(cmd); //parse protocol
            });
            this.modbusServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });
            this.modbusServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
            this.latestNGwInf.length = 0; //clear buffer
            this.GatewayHistoryMember.length = 0; //clear buffer
        });
    }
    //------------------------------------------------------------------------------
    parseModbusCmd(cmd) {
        switch (cmd.cmdtype) {
            case dataTypeModbus_1.modbusCmd.driverInfo: //update driverInfo[]
                this.drivers.length = 0; //clear driver
                this.drivers = cmd.cmdData; //get driverInfo[] and save it
                console.log('account of driver=' + this.drivers.length);
                console.dir(this.drivers);
                break;
            case dataTypeModbus_1.modbusCmd.location:
                this.gwSeq++; //seq +1
                let devPkg = cmd.cmdData;
                let gwInf = {
                    GatewaySeq: this.gwSeq,
                    GatewayIP: this.GwIP,
                    GatewayMAC: this.GwMAC,
                    Datetime: new Date().toLocaleString(),
                    devPkgCount: devPkg.length,
                    devPkgMember: devPkg
                };
                // console.dir(gwInf);//show 
                this.saveGwInfDataInLimitQueue(gwInf, MaxDataQueueLength); //save in last n queue
                this.GatewayHistoryMember.push(gwInf); //save to history memory
                break;
        }
    }
    //----------------------------------------------------------------------------------------
    //get the gateway network ip and mac
    getNetworkInformation() {
        return new Promise((resolve, reject) => {
            network.get_active_interface((err, obj) => {
                if (Boolean(obj) == true) {
                    this.GwIP = obj.ip_address;
                    this.GwMAC = obj.mac_address;
                    resolve(true);
                }
                else {
                    this.GwIP = '';
                    this.GwMAC = '';
                    reject(false);
                }
            });
        });
    }
    //------------------------------------------------------------------
    saveGwInfDataInLimitQueue(gwInf, maxLen) {
        if (this.latestNGwInf.length >= maxLen) {
            this.latestNGwInf.shift(); //remove fisrt item and return it.
        }
        this.latestNGwInf.push(gwInf); //save data
    }
    //-----------------------------------------------------------------------
    getLastGwInfData() {
        return this.latestNGwInf.slice(-1)[0]; //return last data
    }
    //-------------------------------------------------------------------------
    replyWebseverOk(sel) {
        let webPkg = {};
        webPkg.reply = 1;
        switch (sel) {
            case replyType.okBrightness:
                webPkg.msg = "dimming brightness ok";
                break;
            case replyType.okCT:
                webPkg.msg = "dimming color temperature ok";
                break;
            case replyType.okSwitchOnOFF:
                webPkg.msg = "switch on/off ok";
                break;
            case replyType.okReset:
                webPkg.msg = "reset ok";
                break;
            case replyType.okXY:
                webPkg.msg = "Dim XY ok";
                break;
        }
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-------------------------------------------------------------------------
    replyWebseverFail(sel) {
        let webPkg = {};
        webPkg.reply = 0;
        switch (sel) {
            case replyType.failID:
                webPkg.msg = "Driver ID is not exist.";
                break;
            case replyType.failBrightness:
                webPkg.msg = "Dimming brightness is wrong.";
                break;
            case replyType.failCT:
                webPkg.msg = "Dimming color temperature is wrong";
                break;
            case replyType.failSwitchOnOFF:
                webPkg.msg = "switching on/off is wrong";
                break;
            case replyType.failXY:
                webPkg.msg = "Dimming XY fail";
                break;
            case replyType.failNoDriver:
                webPkg.msg = "There is no driver in the network.";
                break;
        }
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-------------------------------------------------------------------------
    //--------------------------------------------------------------------------
    async parseWebCmd(cmd) {
        let driver;
        let cmdLightID = 0;
        let index = -1;
        //check control cmd's driver if exist
        if ((cmd.cmdtype == dataTypeModbus_1.webCmd.postDimingBrightness) || (cmd.cmdtype == dataTypeModbus_1.webCmd.postDimingCT) || (cmd.cmdtype == dataTypeModbus_1.webCmd.postDimingXY) || (cmd.cmdtype == dataTypeModbus_1.webCmd.postSwitchOnOff) || cmd.cmdtype == dataTypeModbus_1.webCmd.getDriver) {
            if (cmd.cmdData.driverId == 255) // all driver
             {
                index = 255;
            }
            else { // find out driver number index
                for (let j = 0; j < this.drivers.length; j++) {
                    if (cmd.cmdData.driverId == this.drivers[j].lightID) {
                        index = j;
                        //console.log("index=" + index);
                        break;
                    }
                }
            }
        }
        switch (cmd.cmdtype) {
            case dataTypeModbus_1.webCmd.getTodaylast: //get today last data
                this.replyWebCmdGetTodayLast();
                break;
            case dataTypeModbus_1.webCmd.getTodayAfter:
                let cmdSeqId = cmd.cmdData;
                this.replyWebCmdGetTodayAfter(cmdSeqId.seqid);
                break;
            case dataTypeModbus_1.webCmd.getToday:
                this.replyWebCmdGetToday();
                break;
            case dataTypeModbus_1.webCmd.getYesterday:
                this.replyWebCmdGetYesterday();
                break;
            case dataTypeModbus_1.webCmd.getDate:
                let cmdDate = cmd.cmdData;
                this.replyWebCmdGetSomeDate(cmdDate.year, cmdDate.month, cmdDate.date);
                break;
            case dataTypeModbus_1.webCmd.getDriver:
                this.replyWebCmdGetDriverInfo(index, cmd);
                break;
            case dataTypeModbus_1.webCmd.postReset:
                this.exeWebCmdPostReset();
                break;
            case dataTypeModbus_1.webCmd.postDimingBrightness:
                this.exeWebCmdPostBrightness(index, cmd);
                break;
            case dataTypeModbus_1.webCmd.postDimingCT:
                if (index == 255) {
                    this.exeWebCmdPostDimTemperatureAll(cmd);
                }
                else {
                    console.log('test');
                    this.exeWebCmdPostDimTemperature(index, cmd);
                }
                // this.exeWebCmdPostDimTemperature(cmdDimingCT.brightness, cmdDimingCT.driverID, cmdDimingCT.CT);
                break;
            case dataTypeModbus_1.webCmd.postDimingXY:
                this.exeWebCmdPostDimColoXY(index, cmd);
                break;
            case dataTypeModbus_1.webCmd.postSwitchOnOff:
                if (index == 255) {
                    console.log('switchOnOff All');
                    this.exeWebCmdPostSwitchOnOffAll(cmd);
                }
                else {
                    console.log('switchOnOff');
                    this.exeWebCmdPostSwitchOnOff(index, cmd);
                }
                break;
        }
    }
    //------------------------------------------------------------------------------------------
    saveHistory2DB() {
        if (this.GatewayHistoryMember.length > 0) //not empty
         {
            //copy GatewayHistoryMember array
            let saveData = this.GatewayHistoryMember.slice(0, this.GatewayHistoryMember.length); //cpoy data
            this.GatewayHistoryMember.length = 0; //clear GatewayHistoryMember array
            this.pgCntrol.dbInsertPacth(this.pgCntrol.tableName, saveData)
                .then(() => {
                saveData.length = 0; //clear saveData array
            });
        }
    }
    //----------------------------------------------------------------------------------------
    savingProcess() {
        this.fSaveDbEn = true;
        //peroid timer 
        this.pSaveDB = setInterval(() => {
            if (this.fSaveDbEn == true) {
                this.saveHistory2DB();
            }
            else {
                clearInterval(this.pSaveDB); //stop timer
            }
        }, saveDatabasePeriod); //execute cmd per saveDatabasePeriod msec
    }
    //---------------------------------------------------------------
    replyWebCmdGetTodayLast() {
        let webPkg = {};
        if (this.latestNGwInf.length > 0) {
            let gwinf = this.getLastGwInfData(); //get last data
            let gwInfoList = [];
            gwInfoList.push(gwinf);
            let gwPkg = {
                GatewaySeqMin: gwInfoList[0].GatewaySeq,
                GatewaySeqMax: gwInfoList[0].GatewaySeq,
                DateTimeMin: gwInfoList[0].Datetime,
                DateTimeMax: gwInfoList[0].Datetime,
                GatewayHistoryCount: 1,
                GatewayHistoryMember: gwInfoList
            };
            webPkg.reply = 1;
            webPkg.msg = gwPkg;
            let webMsg = JSON.stringify(webPkg);
            console.log("web msg");
            console.dir(webMsg);
            this.webServer.sendMessage(webMsg);
        }
        else {
            let gwPkg = {
                GatewaySeqMin: 0,
                GatewaySeqMax: 0,
                DateTimeMin: "",
                DateTimeMax: "",
                GatewayHistoryCount: 0,
                GatewayHistoryMember: []
            };
            webPkg.reply = 1;
            webPkg.msg = gwPkg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
        }
    }
    //---------------------------------------------------------------------------
    replyWebCmdGetTodayAfter(seqID) {
        let webPkg = {};
        this.saveHistory2DB(); //save history to db
        this.pgCntrol.queryAfterSeqID(this.pgCntrol.tableName, seqID)
            .then((value) => {
            let GatewayHistoryMember;
            if (value.rows.length > 0) {
                let index_last = value.rows.length - 1;
                let lastGwInf = value.rows[index_last].gatewaydata;
                let firstGwInf = value.rows[0].gatewaydata;
                let gwInfoList = [];
                value.rows.forEach(item => {
                    gwInfoList.push(item.gatewaydata);
                });
                let gwPkg = {
                    GatewaySeqMin: firstGwInf.GatewaySeq,
                    GatewaySeqMax: lastGwInf.GatewaySeq,
                    DateTimeMin: firstGwInf.Datetime,
                    DateTimeMax: lastGwInf.Datetime,
                    GatewayHistoryCount: gwInfoList.length,
                    GatewayHistoryMember: gwInfoList
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
            else {
                let gwPkg = {
                    GatewaySeqMin: 0,
                    GatewaySeqMax: 0,
                    DateTimeMin: "",
                    DateTimeMax: "",
                    GatewayHistoryCount: 0,
                    GatewayHistoryMember: []
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
        });
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetToday() {
        let webPkg = {};
        this.saveHistory2DB(); //save history to db
        this.pgCntrol.queryAll(this.pgCntrol.tableName)
            .then((value) => {
            console.log(value);
            let GatewayHistoryMember;
            if (value.rows.length > 0) {
                let index_last = value.rows.length - 1;
                let lastGwInf = value.rows[index_last].gatewaydata;
                let firstGwInf = value.rows[0].gatewaydata;
                let gwInfoList = [];
                value.rows.forEach(item => {
                    gwInfoList.push(item.gatewaydata);
                });
                let gwPkg = {
                    GatewaySeqMin: firstGwInf.GatewaySeq,
                    GatewaySeqMax: lastGwInf.GatewaySeq,
                    DateTimeMin: firstGwInf.Datetime,
                    DateTimeMax: lastGwInf.Datetime,
                    GatewayHistoryCount: gwInfoList.length,
                    GatewayHistoryMember: gwInfoList
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
            else {
                let gwPkg = {
                    GatewaySeqMin: 0,
                    GatewaySeqMax: 0,
                    DateTimeMin: "",
                    DateTimeMax: "",
                    GatewayHistoryCount: 0,
                    GatewayHistoryMember: []
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
        })
            .catch((reason) => {
            let webPkg = {};
            webPkg.reply = 0;
            let msg = "no table name!";
            webPkg.msg = msg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
        });
    }
    //----------------------------------------------------------------------------------------
    replyWebCmdGetYesterday() {
        let webPkg = {};
        this.pgCntrol.queryAll(this.pgCntrol.getYesterdayTableName())
            .then((value) => {
            let GatewayHistoryMember;
            if (value.rows.length > 0) {
                let index_last = value.rows.length - 1;
                let lastGwInf = value.rows[index_last].gatewaydata;
                let firstGwInf = value.rows[0].gatewaydata;
                let gwInfoList = [];
                value.rows.forEach(item => {
                    gwInfoList.push(item.gatewaydata);
                });
                let gwPkg = {
                    GatewaySeqMin: firstGwInf.GatewaySeq,
                    GatewaySeqMax: lastGwInf.GatewaySeq,
                    DateTimeMin: firstGwInf.Datetime,
                    DateTimeMax: lastGwInf.Datetime,
                    GatewayHistoryCount: gwInfoList.length,
                    GatewayHistoryMember: gwInfoList
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
            else {
                let gwPkg = {
                    GatewaySeqMin: 0,
                    GatewaySeqMax: 0,
                    DateTimeMin: "",
                    DateTimeMax: "",
                    GatewayHistoryCount: 0,
                    GatewayHistoryMember: []
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
        })
            .catch((reason) => {
            let webPkg = {};
            webPkg.reply = 0;
            let msg = "no table name!";
            webPkg.msg = msg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
        });
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetSomeDate(year, month, date) {
        let webPkg = {};
        this.pgCntrol.queryAll(this.pgCntrol.getSomeDateTableName(year, month, date))
            .then((value) => {
            let GatewayHistoryMember = [];
            if (value.rows.length > 0) {
                let index_last = value.rows.length - 1;
                let lastGwInf = value.rows[index_last].gatewaydata;
                let firstGwInf = value.rows[0].gatewaydata;
                let gwInfoList = [];
                value.rows.forEach(item => {
                    gwInfoList.push(item.gatewaydata);
                });
                let gwPkg = {
                    GatewaySeqMin: firstGwInf.GatewaySeq,
                    GatewaySeqMax: lastGwInf.GatewaySeq,
                    DateTimeMin: firstGwInf.Datetime,
                    DateTimeMax: lastGwInf.Datetime,
                    GatewayHistoryCount: gwInfoList.length,
                    GatewayHistoryMember: gwInfoList
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
            else {
                let gwPkg = {
                    GatewaySeqMin: 0,
                    GatewaySeqMax: 0,
                    DateTimeMin: "",
                    DateTimeMax: "",
                    GatewayHistoryCount: 0,
                    GatewayHistoryMember: []
                };
                webPkg.reply = 1;
                webPkg.msg = gwPkg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            }
        })
            .catch((reason) => {
            let webPkg = {};
            webPkg.reply = 0;
            let msg = "no table name!";
            webPkg.msg = msg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
        });
    }
    //---------------------------------------------------------------------------------
    replyWebCmdGetDriverInfo(index, cmd) {
        if (this.drivers.length > 0) {
            if (index == 255) //query all
             {
                let webPkg = {};
                /*
                console.log(255)
                this.modbusServer.sendMessage(cmd);//sent to modbus
               
                let driver:iDriver={
                    brightness:50,
                    lightType:1,
                    ck:5000,
                    brightnessMin:20,
                    brightnessMax:100,
                    ckMin:3000,
                    ckMax:5500,
                    lightID:1,
                    Mac:'12:34:56:78:90:AB',
                    manufactureID:0,
                    version:1,
                    bleEnable:0
                } */
                let drivers = this.drivers;
                webPkg.reply = 1;
                webPkg.msg = drivers;
                let webMsg = JSON.stringify(webPkg);
                this.webServer.sendMessage(webMsg);
            }
            else if (index >= 0) //query a light
             {
                let driver = this.drivers[index];
                let webPkg = {};
                /*
                //test data
                let driver:iDriver={
                    brightness:50,
                    lightType:1,
                    ck:5000,
                    brightnessMin:20,
                    brightnessMax:100,
                    ckMin:3000,
                    ckMax:5500,
                    lightID:1,
                    Mac:'12:34:56:78:90:AB',
                    manufactureID:0,
                    version:1,
                    bleEnable:0
                }
                 */
                webPkg.reply = 1;
                webPkg.msg = driver;
                let webMsg = JSON.stringify(webPkg); //encrypt
                this.webServer.sendMessage(webMsg);
            }
            else { //can not find light ID 
                this.replyWebseverFail(replyType.failID); //response fail id
            }
        }
        else { //there is no driver in the netwrok
            this.replyWebseverFail(replyType.failNoDriver); //response no driver
        }
    }
    //---------------------------------------------------------------------------------
    exeWebCmdPostReset() {
        let cmd;
        this.modbusServer.sendMessage(cmd);
        this.replyWebseverOk(replyType.okReset);
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostBrightness(index, cmd) {
        if (index >= 0) {
            if (cmd.cmdData.brightness == 0) {
                this.modbusServer.sendMessage(cmd); //sent to modbus
                this.replyWebseverOk(replyType.okBrightness);
            }
            else if ((cmd.cmdData.brightness >= this.drivers[index].brightnessMin) && (cmd.cmdData.brightness <= this.drivers[index].brightnessMax)) {
                this.modbusServer.sendMessage(cmd); //sent to modbus
                this.replyWebseverOk(replyType.okBrightness);
            }
            else {
                this.replyWebseverFail(replyType.failBrightness);
            }
        }
        else {
            this.replyWebseverFail(replyType.failID);
        }
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperature(index, cmd) {
        console.dir(cmd.cmdData.brightness);
        console.dir(cmd.cmdData.driverId);
        console.dir(cmd.cmdData.CT);
        let brightness = cmd.cmdData.brightness;
        let driverID = cmd.cmdData.driverId;
        let CT = cmd.cmdData.CT;
        if (index >= 0) {
            if (brightness == 0) {
                if ((CT >= this.drivers[index].ckMin) && (CT <= this.drivers[index].ckMax)) {
                    this.modbusServer.sendMessage(cmd); //sent to modbus
                    this.replyWebseverOk(replyType.okCT);
                }
                else {
                    this.replyWebseverFail(replyType.failCT);
                }
            }
            else if ((brightness >= this.drivers[index].brightnessMin) && (brightness <= this.drivers[index].brightnessMax)) {
                if ((CT >= this.drivers[index].ckMin) && (CT <= this.drivers[index].ckMax)) {
                    this.modbusServer.sendMessage(cmd); //sent to modbus
                    this.replyWebseverOk(replyType.okCT);
                }
                else {
                    this.replyWebseverFail(replyType.failCT);
                }
            }
            else {
                this.replyWebseverFail(replyType.failCT);
            }
        }
        else {
            this.replyWebseverFail(replyType.failID);
        }
    }
    //----------------------------------------------------------------------------------
    exeWebCmdPostSwitchOnOffAll(cmd) {
        this.modbusServer.sendMessage(cmd); //sent to modbus
        this.replyWebseverOk(replyType.okSwitchOnOFF);
    }
    //----------------------------------------------------------------------------------------------------------
    exeWebCmdPostSwitchOnOff(index, cmd) {
        let switchOnOff = cmd.cmdData.switchOnOff;
        let driverID = cmd.cmdData.driverId;
        if (index >= 0) {
            this.modbusServer.sendMessage(cmd); //sent to modbus
            this.replyWebseverOk(replyType.okSwitchOnOFF);
        }
        else {
            this.replyWebseverFail(replyType.failSwitchOnOFF);
        }
    }
    //----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperatureAll(cmd) {
        let flag = true;
        for (let index = 0; index < this.drivers.length; index++) {
            if (cmd.cmdData.brightness == 0) {
                if ((cmd.cmdData.CT < this.drivers[index].ckMin) && (cmd.cmdData.CT > this.drivers[index].ckMax)) {
                    flag = false;
                    break;
                }
            }
            else if ((cmd.cmdData.brightness > this.drivers[index].brightnessMin) && (cmd.cmdData.brightness > this.drivers[index].brightnessMax)) {
                flag = false;
                break;
            }
            else if ((cmd.cmdData.CT < this.drivers[index].ckMin) && (cmd.cmdData.CT > this.drivers[index].ckMax)) {
                flag = false;
                break;
            }
        }
        if (flag == true) {
            this.modbusServer.sendMessage(cmd); //sent to modbus
            this.replyWebseverOk(replyType.okCT);
        }
        else {
            this.replyWebseverFail(replyType.failCT);
        }
    }
    //-----------------------------------------------------------------------------
    exeWebCmdPostDimColoXY(index, cmd) {
        if (index >= 0) {
            this.modbusServer.sendMessage(cmd); //sent to modbus
            this.replyWebseverFail(replyType.okXY);
        }
        else {
            this.replyWebseverFail(replyType.failID);
        }
    }
    //---------------------------------------------------------------------------------------
    //delay msec function
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
    //------------------------------------------------------------------------------------
    webtest() {
        let devPkg = [];
        let deviceInfo1 = {};
        deviceInfo1.type = dataTypeModbus_1.typesDevice.tag;
        deviceInfo1.mac = "cc:78:ab:6b:fb:07";
        deviceInfo1.seq = 1;
        deviceInfo1.lId1 = 1;
        deviceInfo1.lId2 = 2;
        deviceInfo1.br1 = 100;
        deviceInfo1.br2 = 50;
        deviceInfo1.rssi = -50;
        deviceInfo1.labelX = 10;
        deviceInfo1.labelY = 1;
        deviceInfo1.labelH = 150;
        deviceInfo1.Gx = 1;
        deviceInfo1.Gy = 0;
        deviceInfo1.Gz = -1;
        deviceInfo1.batPow = 90;
        deviceInfo1.recLightID = 1;
        deviceInfo1.other = {};
        let tag = {};
        tag.type = deviceInfo1.type;
        tag.mac = deviceInfo1.mac;
        tag.seq = deviceInfo1.seq;
        tag.lId1 = deviceInfo1.lId1;
        tag.lId2 = deviceInfo1.lId2;
        tag.br1 = deviceInfo1.br1;
        tag.br2 = deviceInfo1.br2;
        tag.Gx = deviceInfo1.Gx;
        tag.Gy = deviceInfo1.Gy;
        tag.Gz = deviceInfo1.Gz;
        tag.batPow = deviceInfo1.batPow;
        tag.labelY = deviceInfo1.labelX;
        tag.labelY = deviceInfo1.labelY;
        tag.other = deviceInfo1.other;
        tag.rxLightInfo = [];
        let rxLightInfo1 = { recLightID: deviceInfo1.recLightID, rssi: deviceInfo1.rssi };
        let rxLightInfo2 = { recLightID: 2, rssi: -70 };
        let rxLightInfo3 = { recLightID: 3, rssi: -90 };
        tag.rxLightInfo.push(rxLightInfo1);
        tag.rxLightInfo.push(rxLightInfo2);
        tag.rxLightInfo.push(rxLightInfo3);
        tag.rxLightCount = tag.rxLightInfo.length;
        //
        //this.devPkgMember.push(devPkg);//save devPkg into devPkgMember
        devPkg.push(tag);
        let deviceInfo2 = {};
        deviceInfo2.type = dataTypeModbus_1.typesDevice.dripStand;
        deviceInfo2.mac = "cc:78:ab:6b:fb:08";
        deviceInfo2.seq = 1;
        deviceInfo2.lId1 = 1;
        deviceInfo2.lId2 = 2;
        deviceInfo2.br1 = 100;
        deviceInfo2.br2 = 50;
        deviceInfo2.rssi = -55;
        deviceInfo2.labelX = 10;
        deviceInfo2.labelY = 1;
        deviceInfo2.labelH = 150;
        deviceInfo2.Gx = 1;
        deviceInfo2.Gy = 0;
        deviceInfo2.Gz = -1;
        deviceInfo2.batPow = 90;
        deviceInfo2.recLightID = 1;
        deviceInfo2.other = { weight: 900, speed: 20, time: 25 };
        let dripstand = {};
        dripstand.type = deviceInfo2.type;
        dripstand.mac = deviceInfo2.mac;
        dripstand.seq = deviceInfo2.seq;
        dripstand.lId1 = deviceInfo2.lId1;
        dripstand.lId2 = deviceInfo2.lId2;
        dripstand.br1 = deviceInfo2.br1;
        dripstand.br2 = deviceInfo2.br2;
        dripstand.Gx = deviceInfo2.Gx;
        dripstand.Gy = deviceInfo2.Gy;
        dripstand.Gz = deviceInfo2.Gz;
        dripstand.batPow = deviceInfo2.batPow;
        dripstand.labelY = deviceInfo2.labelX;
        dripstand.labelY = deviceInfo2.labelY;
        dripstand.other = deviceInfo2.other;
        dripstand.rxLightInfo = [];
        let rxLightInfo4 = { recLightID: deviceInfo2.recLightID, rssi: deviceInfo2.rssi };
        let rxLightInfo5 = { recLightID: 2, rssi: -65 };
        let rxLightInfo6 = { recLightID: 3, rssi: -90 };
        dripstand.rxLightInfo.push(rxLightInfo1);
        dripstand.rxLightInfo.push(rxLightInfo2);
        dripstand.rxLightInfo.push(rxLightInfo3);
        dripstand.rxLightCount = dripstand.rxLightInfo.length;
        devPkg.push(dripstand);
        let newGWInf = {};
        newGWInf.GatewaySeq = this.gwSeq++;
        newGWInf.GatewayIP = this.GwIP;
        newGWInf.GatewayMAC = this.GwMAC;
        newGWInf.Datetime = (new Date()).toLocaleString();
        newGWInf.devPkgCount = devPkg.length;
        newGWInf.devPkgMember = devPkg;
        this.latestNGwInf.push(newGWInf);
    }
}
exports.ControlProcess = ControlProcess;
let controlProcess = new ControlProcess();
//# sourceMappingURL=controlProcess.js.map