import { SocketWebServer } from './socketWebServer';
import { SocketModbusServer } from './socketModbusServer';
import * as network from 'network';
import * as DTCMD from './dataTypeCmd';
import { PgControl } from './pgControl'
import { iDriver, iDevInfo, iReadableRegister, iDripstand, iDevPkg, iGwInf, iGwPkg } from './dataTypeModbus';


let saveDatabasePeriod = 6000;//60 sec
let MaxDataQueueLength = 3;

enum modbusCmd {
    driverInfo = 1,
    location,
}

enum webCmd {
    getTodaylast = 1,
    getTodayAfter,
    getToday,
    getYesterday,
    getDate,
    postReset,
    postDimingBrightness,
    postDimingCT,
    postDimingXY,
    msgError = 404
}

export class ControlProcess {
    webServer: SocketWebServer = new SocketWebServer();
    modbusServer: SocketModbusServer = new SocketModbusServer();
    pgCntrol: PgControl = new PgControl();
    GwIP: string;
    GwMAC: string;
    drivers: iDriver[];
    gwSeq: number = 0;
    GatewayHistoryMember: iGwInf[]=[];
    pSaveDB: NodeJS.Timeout;
    flagSaveTimeUp: boolean;
    latestNGwInf: iGwInf[] = [];//save the lastest 3 gwinf in memory



    constructor() {
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
            })

        await this.delay(1000);//delay 100 msecond
        this.listenWebserver();//start listen webserver
        this.listenModbusServer();//start listen modbus server
        this.savingProcess();
    }
    //-----------------------------------------------------------------------------------------------------------
    listenWebserver() {
        this.webServer.socketWebserver.on("connection", (socket) => {
            this.webServer.socket = socket;
            let clientName = `${this.webServer.socket.remoteAddress}:${this.webServer.socket.remotePort}`;
            console.log("connection from " + clientName);

            this.webServer.socket.on('data', (data: any) => {
                let cmd: DTCMD.iCmd = JSON.parse(data);
                console.dir(cmd);


            })

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

            this.modbusServer.socket.on('data', (data: any) => {
                let cmd: DTCMD.iCmd = JSON.parse(data);
                console.dir(cmd);
                switch (cmd.cmdtype) {
                    case modbusCmd.driverInfo:
                        this.drivers = cmd.cmdData;
                        break;

                    case modbusCmd.driverInfo:
                        this.gwSeq++;//seq +1
                        let devPkg: iDevPkg[] = cmd.cmdData;
                        let gwInf: iGwInf = {
                            GatewaySeq: this.gwSeq,
                            GatewayIP: this.GwIP,
                            GatewayMAC: this.GwMAC,
                            Datetime: new Date().toLocaleString(),
                            devPkgCount: devPkg.length,
                            devPkgMember: devPkg
                        }
                        this.saveGwInfDataInLimitQueue(gwInf, MaxDataQueueLength);
                        this.GatewayHistoryMember.push(gwInf);//save to memory

                        break;
                }
            })

            this.modbusServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });

            this.modbusServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }

    //----------------------------------------------------------------------------------------
    getNetworkInformation(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {

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
    saveGwInfDataInLimitQueue(gwInf: iGwInf, maxLen: number) {
        if (this.latestNGwInf.length >= maxLen) {
            this.latestNGwInf.shift();//remove fisrt item and return it.
        }
        this.latestNGwInf.push(gwInf);//save data
    }
    //-----------------------------------------------------------------------
    getLastGwInfData(): iGwInf {
        return this.latestNGwInf.slice(-1)[0];//return last data
    }

    //--------------------------------------------------------------------------
    parseWebCmd(cmd: DTCMD.iCmd) {

        switch (cmd.cmdtype) {
            case webCmd.getTodaylast://get today last data
                this.replyWebCmdGetTodayLast();
                break;

            case webCmd.getTodayAfter:
                let cmdSeqId: DTCMD.iSeqId = cmd.cmdData;
                this.replyWebCmdGetTodayAfter(cmdSeqId.seqid);
                break;

            case webCmd.getToday:
                this.replyWebCmdGetToday();
                break;

            case webCmd.getYesterday:
                this.replyWebCmdGetYesterday();
                break;

            case webCmd.getDate:
                let cmdDate: DTCMD.iDate = cmd.cmdData;
                this.replyWebCmdGetSomeDate(cmdDate.year, cmdDate.month, cmdDate.date);
                break;

            case webCmd.postReset:
                this.exeWebCmdPostReset();
                break;

            case webCmd.postDimingBrightness:
                let cmdBrightness: DTCMD.iBrightness = cmd.cmdData;
                this.exeWebCmdPostBrightness(cmdBrightness.brightness, cmdBrightness.driverID);
                break;

            case webCmd.postDimingCT:
                let cmdDimingCT: DTCMD.iColorTemperature = cmd.cmdData;
                this.exeWebCmdPostDimTemperature(cmdDimingCT.brightness, cmdDimingCT.driverID, cmdDimingCT.CT);
                break;

            case webCmd.postDimingXY:
                let cmdDimingXY: DTCMD.iColorXY = cmd.cmdData;
                this.exeWebCmdPostDimColoXY(cmdDimingXY.brightness, cmdDimingXY.driverID, cmdDimingXY.colorX, cmdDimingXY.colorY);
                break;
        }
    }

    //------------------------------------------------------------------------------------------
    saveHistory2DB() {
        if (this.GatewayHistoryMember.length > 0)//not empty
        {
            //copy GatewayHistoryMember array
            let saveData: iGwInf[] = this.GatewayHistoryMember.slice(0, this.GatewayHistoryMember.length);
            this.GatewayHistoryMember.length = 0;//clear GatewayHistoryMember array
            this.pgCntrol.dbInsertPacth(this.pgCntrol.tableName, saveData)
                .then(() => {
                    saveData.length = 0;//clear saveData array
                });
        }
    }
    //----------------------------------------------------------------------------------------
    savingProcess() {
        //peroid timer 
        this.pSaveDB = setInterval(() => {
            this.saveHistory2DB();
        }, saveDatabasePeriod);//execute cmd per saveDatabasePeriod msec
    }
    //---------------------------------------------------------------
    replyWebCmdGetTodayLast() {
        if (this.latestNGwInf.length > 0) {
            let gwinf: iGwInf = this.getLastGwInfData();//get last data
            let gwPkg: iGwPkg = {
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
            let gwPkg: iGwPkg = {
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
    replyWebCmdGetTodayAfter(seqID: number) {
        this.saveHistory2DB();//save history to db
        this.pgCntrol.queryAfterSeqID(this.pgCntrol.tableName, seqID)
            .then((value) => {
                let GatewayHistoryMember: iGwInf[];
                if (value.rows.length > 0) {
                    let index_last: number = value.rows.length - 1;
                    let lastGwInf: iGwInf = value.rows[index_last].gatewaydata;
                    let firstGwInf: iGwInf = value.rows[0].gatewaydata;
                    let gwInfoList: iGwInf[] = [];
                    value.rows.forEach(item => {
                        gwInfoList.push(item.gatewaydata);
                    });
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: firstGwInf.GatewaySeq,
                        GatewaySeqMax: lastGwInf.GatewaySeq,
                        DateTimeMin: firstGwInf.Datetime,
                        DateTimeMax: lastGwInf.Datetime,
                        GatewayHistoryCount: gwInfoList.length,
                        GatewayHistoryMember: gwInfoList
                    }
                    this.webServer.sendMessage(gwPkg);
                }
                else {
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: 0,
                        GatewaySeqMax: 0,
                        DateTimeMin: "",
                        DateTimeMax: "",
                        GatewayHistoryCount: 0,
                        GatewayHistoryMember: []
                    }
                    this.webServer.sendMessage(gwPkg);
                }
            })

    }

    //---------------------------------------------------------------------------------------
    replyWebCmdGetToday() {
        this.saveHistory2DB();//save history to db
        this.pgCntrol.queryAll(this.pgCntrol.tableName)
            .then((value) => {
                let GatewayHistoryMember: iGwInf[];
                if (value.rows.length > 0) {
                    let index_last: number = value.rows.length - 1;
                    let lastGwInf: iGwInf = value.rows[index_last].gatewaydata;
                    let firstGwInf: iGwInf = value.rows[0].gatewaydata;
                    let gwInfoList: iGwInf[] = [];
                    value.rows.forEach(item => {
                        gwInfoList.push(item.gatewaydata);
                    });
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: firstGwInf.GatewaySeq,
                        GatewaySeqMax: lastGwInf.GatewaySeq,
                        DateTimeMin: firstGwInf.Datetime,
                        DateTimeMax: lastGwInf.Datetime,
                        GatewayHistoryCount: gwInfoList.length,
                        GatewayHistoryMember: gwInfoList
                    }
                    this.webServer.sendMessage(gwPkg);
                }
                else {
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: 0,
                        GatewaySeqMax: 0,
                        DateTimeMin: "",
                        DateTimeMax: "",
                        GatewayHistoryCount: 0,
                        GatewayHistoryMember: []
                    }
                    this.webServer.sendMessage(gwPkg);
                }
            })
    }
    //----------------------------------------------------------------------------------------
    replyWebCmdGetYesterday() {
        this.pgCntrol.queryAll(this.pgCntrol.getYesterdayTableName())
            .then((value) => {
                let GatewayHistoryMember: iGwInf[];
                if (value.rows.length > 0) {
                    let index_last: number = value.rows.length - 1;
                    let lastGwInf: iGwInf = value.rows[index_last].gatewaydata;
                    let firstGwInf: iGwInf = value.rows[0].gatewaydata;
                    let gwInfoList: iGwInf[] = [];
                    value.rows.forEach(item => {
                        gwInfoList.push(item.gatewaydata);
                    });
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: firstGwInf.GatewaySeq,
                        GatewaySeqMax: lastGwInf.GatewaySeq,
                        DateTimeMin: firstGwInf.Datetime,
                        DateTimeMax: lastGwInf.Datetime,
                        GatewayHistoryCount: gwInfoList.length,
                        GatewayHistoryMember: gwInfoList
                    }
                    this.webServer.sendMessage(gwPkg);
                }
                else {
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: 0,
                        GatewaySeqMax: 0,
                        DateTimeMin: "",
                        DateTimeMax: "",
                        GatewayHistoryCount: 0,
                        GatewayHistoryMember: []
                    }
                    this.webServer.sendMessage(gwPkg);
                }
            })
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetSomeDate(year: number, month: number, date: number) {
        this.pgCntrol.queryAll(this.pgCntrol.getSomeDateTableName(year, month, date))
            .then((value) => {
                let GatewayHistoryMember: iGwInf[];
                if (value.rows.length > 0) {
                    let index_last: number = value.rows.length - 1;
                    let lastGwInf: iGwInf = value.rows[index_last].gatewaydata;
                    let firstGwInf: iGwInf = value.rows[0].gatewaydata;
                    let gwInfoList: iGwInf[] = [];
                    value.rows.forEach(item => {
                        gwInfoList.push(item.gatewaydata);
                    });
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: firstGwInf.GatewaySeq,
                        GatewaySeqMax: lastGwInf.GatewaySeq,
                        DateTimeMin: firstGwInf.Datetime,
                        DateTimeMax: lastGwInf.Datetime,
                        GatewayHistoryCount: gwInfoList.length,
                        GatewayHistoryMember: gwInfoList
                    }
                    this.webServer.sendMessage(gwPkg);
                }
                else {
                    let gwPkg: iGwPkg =
                    {
                        GatewaySeqMin: 0,
                        GatewaySeqMax: 0,
                        DateTimeMin: "",
                        DateTimeMax: "",
                        GatewayHistoryCount: 0,
                        GatewayHistoryMember: []
                    }
                    this.webServer.sendMessage(gwPkg);
                }
            })
    }
    //---------------------------------------------------------------------------------
    exeWebCmdPostReset() {

    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostBrightness(brightness: number, driverID: number) {

    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperature(brightness: number, driverID: number, CT: number) {

    }

    //-----------------------------------------------------------------------------
    exeWebCmdPostDimColoXY(brightness: number, driverID: number, colorX: number, colorY: number) {

    }


    //---------------------------------------------------------------------------------------
    //delay msec function
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }
}

let controlProcess = new ControlProcess();

















