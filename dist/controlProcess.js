"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketWebServer_1 = require("./socketWebServer");
const socketModbusServer_1 = require("./socketModbusServer");
const network = require("network");
const pgControl_1 = require("./pgControl");
let saveDatabasePeriod = 6000; //60 sec
let MaxDataQueueLength = 3;
var modbusCmd;
(function (modbusCmd) {
    modbusCmd[modbusCmd["driverInfo"] = 1] = "driverInfo";
    modbusCmd[modbusCmd["location"] = 2] = "location";
})(modbusCmd || (modbusCmd = {}));
var webCmd;
(function (webCmd) {
    webCmd[webCmd["getTodaylast"] = 1] = "getTodaylast";
    webCmd[webCmd["getTodayAfter"] = 2] = "getTodayAfter";
    webCmd[webCmd["getToday"] = 3] = "getToday";
    webCmd[webCmd["getYesterday"] = 4] = "getYesterday";
    webCmd[webCmd["getDate"] = 5] = "getDate";
    webCmd[webCmd["postReset"] = 6] = "postReset";
    webCmd[webCmd["postDimingBrightness"] = 7] = "postDimingBrightness";
    webCmd[webCmd["postDimingCT"] = 8] = "postDimingCT";
    webCmd[webCmd["postDimingXY"] = 9] = "postDimingXY";
    webCmd[webCmd["msgError"] = 404] = "msgError";
})(webCmd || (webCmd = {}));
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
    }
    //-----------------------------------------------------------------------------------------------------------
    listenWebserver() {
        this.webServer.socketWebserver.on("connection", (socket) => {
            this.webServer.socket = socket;
            let clientName = `${this.webServer.socket.remoteAddress}:${this.webServer.socket.remotePort}`;
            console.log("connection from " + clientName);
            this.webServer.socket.on('data', (data) => {
                let cmd = JSON.parse(data);
                console.dir(cmd);
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
                    case modbusCmd.driverInfo:
                        this.drivers = cmd.cmdData;
                        break;
                    case modbusCmd.driverInfo:
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
            case webCmd.getTodaylast: //get today last data
                this.replyWebCmdGetTodayLast();
                break;
            case webCmd.getTodayAfter:
                let cmdSeqId = cmd.cmdData;
                this.replyWebCmdGetTodayAfter(cmdSeqId.seqid);
                break;
            case webCmd.getToday:
                this.replyWebCmdGetToday();
                break;
            case webCmd.getYesterday:
                this.replyWebCmdGetYesterday();
                break;
            case webCmd.getDate:
                let cmdDate = cmd.cmdData;
                this.replyWebCmdGetSomeDate(cmdDate.year, cmdDate.month, cmdDate.date);
                break;
            case webCmd.postReset:
                this.exeWebCmdPostReset();
                break;
            case webCmd.postDimingBrightness:
                let cmdBrightness = cmd.cmdData;
                this.exeWebCmdPostBrightness(cmdBrightness.brightness, cmdBrightness.driverID);
                break;
            case webCmd.postDimingCT:
                let cmdDimingCT = cmd.cmdData;
                this.exeWebCmdPostDimTemperature(cmdDimingCT.brightness, cmdDimingCT.driverID, cmdDimingCT.CT);
                break;
            case webCmd.postDimingXY:
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
            this.webServer.sendMessage(gwPkg);
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
            this.webServer.sendMessage(gwPkg);
        }
    }
    //---------------------------------------------------------------------------
    replyWebCmdGetTodayAfter(seqID) {
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
                this.webServer.sendMessage(gwPkg);
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
                this.webServer.sendMessage(gwPkg);
            }
        });
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetToday() {
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
                this.webServer.sendMessage(gwPkg);
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
                this.webServer.sendMessage(gwPkg);
            }
        });
    }
    //----------------------------------------------------------------------------------------
    replyWebCmdGetYesterday() {
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
                this.webServer.sendMessage(gwPkg);
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
                this.webServer.sendMessage(gwPkg);
            }
        });
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetSomeDate(year, month, date) {
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
                this.webServer.sendMessage(gwPkg);
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
                this.webServer.sendMessage(gwPkg);
            }
        });
    }
    //---------------------------------------------------------------------------------
    exeWebCmdPostReset() {
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostBrightness(brightness, driverID) {
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperature(brightness, driverID, CT) {
    }
    //-----------------------------------------------------------------------------
    exeWebCmdPostDimColoXY(brightness, driverID, colorX, colorY) {
    }
    //---------------------------------------------------------------------------------------
    //delay msec function
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
}
exports.ControlProcess = ControlProcess;
let controlProcess = new ControlProcess();
//# sourceMappingURL=controlProcess.js.map