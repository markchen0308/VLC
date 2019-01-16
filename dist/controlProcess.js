"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketWebServer_1 = require("./socketWebServer");
const socketModbusServer_1 = require("./socketModbusServer");
const network = require("network");
const pgControl_1 = require("./pgControl");
const dataTypeModbus_1 = require("./dataTypeModbus");
let saveDatabasePeriod = 6000; //60 sec
let MaxDataQueueLength = 3;
class ControlProcess {
    constructor() {
        this.webServer = new socketWebServer_1.SocketWebServer();
        this.modbusServer = new socketModbusServer_1.SocketModbusServer();
        this.pgCntrol = new pgControl_1.PgControl();
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
        this.savingProcess();
        this.webtest(); //test webserver
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
            this.modbusServer.socket.on('data', (data) => {
                let cmd = JSON.parse(data);
                console.dir(cmd);
                switch (cmd.cmdtype) {
                    case dataTypeModbus_1.modbusCmd.driverInfo:
                        this.drivers = cmd.cmdData;
                        break;
                    case dataTypeModbus_1.modbusCmd.driverInfo:
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
                        this.saveGwInfDataInLimitQueue(gwInf, MaxDataQueueLength);
                        this.GatewayHistoryMember.push(gwInf); //save to memory
                        break;
                }
            });
            this.modbusServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });
            this.modbusServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }
    //----------------------------------------------------------------------------------------
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
    //--------------------------------------------------------------------------
    parseWebCmd(cmd) {
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
            case dataTypeModbus_1.webCmd.postReset:
                this.exeWebCmdPostReset();
                break;
            case dataTypeModbus_1.webCmd.postDimingBrightness:
                let cmdBrightness = cmd.cmdData;
                this.exeWebCmdPostBrightness(cmdBrightness.brightness, cmdBrightness.driverID);
                break;
            case dataTypeModbus_1.webCmd.postDimingCT:
                let cmdDimingCT = cmd.cmdData;
                this.exeWebCmdPostDimTemperature(cmdDimingCT.brightness, cmdDimingCT.driverID, cmdDimingCT.CT);
                break;
            case dataTypeModbus_1.webCmd.postDimingXY:
                let cmdDimingXY = cmd.cmdData;
                this.exeWebCmdPostDimColoXY(cmdDimingXY.brightness, cmdDimingXY.driverID, cmdDimingXY.colorX, cmdDimingXY.colorY);
                break;
        }
    }
    //------------------------------------------------------------------------------------------
    saveHistory2DB() {
        if (this.GatewayHistoryMember.length > 0) //not empty
         {
            //copy GatewayHistoryMember array
            let saveData = this.GatewayHistoryMember.slice(0, this.GatewayHistoryMember.length);
            this.GatewayHistoryMember.length = 0; //clear GatewayHistoryMember array
            this.pgCntrol.dbInsertPacth(this.pgCntrol.tableName, saveData)
                .then(() => {
                saveData.length = 0; //clear saveData array
            });
        }
    }
    //----------------------------------------------------------------------------------------
    savingProcess() {
        //peroid timer 
        this.pSaveDB = setInterval(() => {
            this.saveHistory2DB();
        }, saveDatabasePeriod); //execute cmd per saveDatabasePeriod msec
    }
    //---------------------------------------------------------------
    replyWebCmdGetTodayLast() {
        let webPkg = {};
        if (this.latestNGwInf.length > 0) {
            let gwinf = this.getLastGwInfData(); //get last data
            let gwPkg = {
                GatewaySeqMin: gwinf.GatewaySeq,
                GatewaySeqMax: gwinf.GatewaySeq,
                DateTimeMin: gwinf.Datetime,
                DateTimeMax: gwinf.Datetime,
                GatewayHistoryCount: 1,
                GatewayHistoryMember: [gwinf]
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
        });
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetSomeDate(year, month, date) {
        let webPkg = {};
        this.pgCntrol.queryAll(this.pgCntrol.getSomeDateTableName(year, month, date))
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
    //---------------------------------------------------------------------------------
    exeWebCmdPostReset() {
        let webPkg = {};
        webPkg.reply = 1;
        webPkg.msg = "ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostBrightness(brightness, driverID) {
        let webPkg = {};
        webPkg.reply = 1;
        webPkg.msg = "ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperature(brightness, driverID, CT) {
        let webPkg = {};
        webPkg.reply = 1;
        webPkg.msg = "ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-----------------------------------------------------------------------------
    exeWebCmdPostDimColoXY(brightness, driverID, colorX, colorY) {
        let webPkg = {};
        webPkg.reply = 1;
        webPkg.msg = "ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
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
        deviceInfo1.mac = "123456789ABC";
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
        deviceInfo2.mac = "1122334455AB";
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
        deviceInfo2.other = { weight: 900, speed: 20 };
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