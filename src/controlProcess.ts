import { SocketWebServer } from './socketWebServer';
import { SocketModbusServer } from './socketModbusServer';
import * as network from 'network';
import * as DTCMD from './dataTypeCmd';
import { PgControl } from './pgControl'
import { iDriver, iDevInfo, iReadableRegister, iDripstand, iDevPkg, iGwInf, iGwPkg, iWebPkg, iRxLightInfo } from './dataTypeModbus';
import { holdingRegisterAddress, inputregisterAddress, typesDevice, deviceLength, devAddress, otherDripStandAddress, modbusCmd, webCmd } from './dataTypeModbus';
import { timingSafeEqual } from 'crypto';



let saveDatabasePeriod: number = 6000;//60 sec
let MaxDataQueueLength: number = 3;


enum replyType {
    failID,
    failBrightness,
    failCT,
    failSwitchOnOFF,
    failXY,
    failNoDriver,
    okBrightness,
    okCT,
    okSwitchOnOFF,
    okXY,
    okReset,
    okQueryLocation,
}



export class ControlProcess {
    webServer: SocketWebServer = new SocketWebServer();
    modbusServer: SocketModbusServer = new SocketModbusServer();
    pgCntrol: PgControl = new PgControl();
    GwIP: string;
    GwMAC: string;
    drivers: iDriver[] = [];
    gwSeq: number = 0;
    GatewayHistoryMember: iGwInf[] = [];
    pSaveDB: NodeJS.Timeout;
    fSaveDbEn: boolean;
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
        this.savingProcess();//save history data

        //this.webtest();//test webserver
    }
    //-----------------------------------------------------------------------------------------------------------
    listenWebserver() {
        this.webServer.socketWebserver.on("connection", (socket) => {
            this.webServer.socket = socket;
            let clientName = `${this.webServer.socket.remoteAddress}:${this.webServer.socket.remotePort}`;
            console.log("connection from " + clientName);

            this.webServer.socket.on('data', (data: any) => {
                let cmd: DTCMD.iCmd = JSON.parse(data);
                this.parseWebCmd(cmd);//parse cmd and execute cmd
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

            //get data from modbus
            this.modbusServer.socket.on('data', (data: any) => {
                let cmd: DTCMD.iCmd = JSON.parse(data);//parse JSON data
                this.parseModbusCmd(cmd);//parse protocol
            })

            this.modbusServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });

            this.modbusServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });


            this.latestNGwInf.length = 0;//clear buffer
            this.GatewayHistoryMember.length = 0;//clear buffer

        });
    }
    //------------------------------------------------------------------------------
    parseModbusCmd(cmd: DTCMD.iCmd) {

        switch (cmd.cmdtype) {
            case modbusCmd.driverInfo://update driverInfo[]
                this.drivers.length = 0;//clear driver
                this.drivers = cmd.cmdData;//get driverInfo[] and save it
                console.log('account of driver=' + this.drivers.length)
                console.dir(this.drivers);
                break;

            case modbusCmd.location:
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
                // console.dir(gwInf);//show 
                this.saveGwInfDataInLimitQueue(gwInf, MaxDataQueueLength);//save in last n queue
                this.GatewayHistoryMember.push(gwInf);//save to history memory

                break;
        }
    }

    //----------------------------------------------------------------------------------------
    //get the gateway network ip and mac
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
    //-------------------------------------------------------------------------
    replyWebseverOk(sel: replyType) {
        let webPkg: iWebPkg = {};
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
    replyWebseverFail(sel: replyType) {
        let webPkg: iWebPkg = {};
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
    async parseWebCmd(cmd: DTCMD.iCmd) {
        let driver: iDriver;
        let cmdLightID: number = 0;
        let index: number = -1;
        //check control cmd's driver if exist
        if ((cmd.cmdtype == webCmd.postDimingBrightness) || (cmd.cmdtype == webCmd.postDimingCT) || (cmd.cmdtype == webCmd.postDimingXY) || (cmd.cmdtype == webCmd.postSwitchOnOff) || cmd.cmdtype == webCmd.getDriver) {

            if (cmd.cmdData.driverId == 255) // all driver
            {
                index = 255;
            }
            else {// find out driver number index
                for (let j: number = 0; j < this.drivers.length; j++) {
                    if (cmd.cmdData.driverId == this.drivers[j].lightID) {
                        index = j;
                        //console.log("index=" + index);
                        break;
                    }
                }
            }

        }

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

            case webCmd.getDriver:
                this.replyWebCmdGetDriverInfo(index, cmd);
                break;

            case webCmd.postReset:
                this.exeWebCmdPostReset();
                break;

            case webCmd.postDimingBrightness:
                this.exeWebCmdPostBrightness(index, cmd);
                break;

            case webCmd.postDimingCT:
                if (index == 255) {
                    this.exeWebCmdPostDimTemperatureAll(cmd);
                }
                else {
                    console.log('test')
                    this.exeWebCmdPostDimTemperature(index, cmd);
                }

                // this.exeWebCmdPostDimTemperature(cmdDimingCT.brightness, cmdDimingCT.driverID, cmdDimingCT.CT);
                break;

            case webCmd.postDimingXY:
                this.exeWebCmdPostDimColoXY(index, cmd);

                break;

            case webCmd.postSwitchOnOff:
                if (index == 255) {
                    console.log('switchOnOff All')
                    this.exeWebCmdPostSwitchOnOffAll(cmd);
                }
                else {
                    console.log('switchOnOff')
                    this.exeWebCmdPostSwitchOnOff(index, cmd);
                }
                break;
        }
    }

    //------------------------------------------------------------------------------------------
    saveHistory2DB() {
        if (this.GatewayHistoryMember.length > 0)//not empty
        {
            //copy GatewayHistoryMember array
            let saveData: iGwInf[] = this.GatewayHistoryMember.slice(0, this.GatewayHistoryMember.length);//cpoy data
            this.GatewayHistoryMember.length = 0;//clear GatewayHistoryMember array
            this.pgCntrol.dbInsertPacth(this.pgCntrol.tableName, saveData)
                .then(() => {
                    saveData.length = 0;//clear saveData array
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
                clearInterval(this.pSaveDB);//stop timer
            }
        }, saveDatabasePeriod);//execute cmd per saveDatabasePeriod msec
    }
    //---------------------------------------------------------------
    replyWebCmdGetTodayLast() {

        let webPkg: iWebPkg = {};

        if (this.latestNGwInf.length > 0) {
            let gwinf: iGwInf = this.getLastGwInfData();//get last data
            let gwInfoList: iGwInf[] = [];
            gwInfoList.push(gwinf);
            let gwPkg: iGwPkg = {
                GatewaySeqMin: gwInfoList[0].GatewaySeq,
                GatewaySeqMax: gwInfoList[0].GatewaySeq,
                DateTimeMin: gwInfoList[0].Datetime,
                DateTimeMax: gwInfoList[0].Datetime,
                GatewayHistoryCount: 1,
                GatewayHistoryMember: gwInfoList
            };

            webPkg.reply = 1;
            webPkg.msg = gwPkg;
            let webMsg: string = JSON.stringify(webPkg);
            console.log("web msg");
            console.dir(webMsg);
            this.webServer.sendMessage(webMsg);
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
            webPkg.reply = 1;
            webPkg.msg = gwPkg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
        }
    }

    //---------------------------------------------------------------------------
    replyWebCmdGetTodayAfter(seqID: number) {
        let webPkg: iWebPkg = {};
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })

    }

    //---------------------------------------------------------------------------------------
    replyWebCmdGetToday() {
        let webPkg: iWebPkg = {};
        this.saveHistory2DB();//save history to db
        this.pgCntrol.queryAll(this.pgCntrol.tableName)
            .then((value) => {
                console.log(value);
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })
            .catch((reason) => {
                let webPkg: iWebPkg = {};
                webPkg.reply = 0;
                let msg: string = "no table name!"
                webPkg.msg = msg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            })
    }
    //----------------------------------------------------------------------------------------
    replyWebCmdGetYesterday() {
        let webPkg: iWebPkg = {};
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })
            .catch((reason) => {
                let webPkg: iWebPkg = {};
                webPkg.reply = 0;
                let msg: string = "no table name!"
                webPkg.msg = msg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            })
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetSomeDate(year: number, month: number, date: number) {
        let webPkg: iWebPkg = {};
        this.pgCntrol.queryAll(this.pgCntrol.getSomeDateTableName(year, month, date))
            .then((value) => {
                let GatewayHistoryMember: iGwInf[] = [];
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
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
                    webPkg.reply = 1;
                    webPkg.msg = gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })
            .catch((reason) => {
                let webPkg: iWebPkg = {};
                webPkg.reply = 0;
                let msg: string = "no table name!"
                webPkg.msg = msg;
                this.webServer.sendMessage(JSON.stringify(webPkg));
            })
    }

    //---------------------------------------------------------------------------------
    replyWebCmdGetDriverInfo(index: number, cmd: DTCMD.iCmd) {
        if (this.drivers.length > 0) {
            if (index == 255)//query all
            {
                let webPkg: iWebPkg = {};
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
                let webMsg: string = JSON.stringify(webPkg);
                this.webServer.sendMessage(webMsg);
            }
            else if (index >= 0)//query a light
            {
                let driver = this.drivers[index];

                let webPkg: iWebPkg = {};
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
                let webMsg: string = JSON.stringify(webPkg);//encrypt
                this.webServer.sendMessage(webMsg);

            }
            else {//can not find light ID 
                this.replyWebseverFail(replyType.failID);//response fail id
            }
        }
        else {//there is no driver in the netwrok
            this.replyWebseverFail(replyType.failNoDriver);//response no driver
        }

    }
    //---------------------------------------------------------------------------------
    exeWebCmdPostReset() {

        let cmd: DTCMD.iCmd;
        this.modbusServer.sendMessage(cmd);
        this.replyWebseverOk(replyType.okReset);
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostBrightness(index: number, cmd: DTCMD.iCmd) {
        if (index >= 0) {
            if (cmd.cmdData.brightness == 0) {
                this.modbusServer.sendMessage(cmd);//sent to modbus
                this.replyWebseverOk(replyType.okBrightness);
            }
            else if ((cmd.cmdData.brightness >= this.drivers[index].brightnessMin) && (cmd.cmdData.brightness <= this.drivers[index].brightnessMax)) {
                this.modbusServer.sendMessage(cmd);//sent to modbus
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
    exeWebCmdPostDimTemperature(index: number, cmd: DTCMD.iCmd) {

        console.dir(cmd.cmdData.brightness)
        console.dir(cmd.cmdData.driverId)
        console.dir(cmd.cmdData.CT)

        let brightness: number = cmd.cmdData.brightness;
        let driverID: number = cmd.cmdData.driverId;
        let CT: number = cmd.cmdData.CT;

        if (index >= 0) {
            if (brightness == 0) {
                if ((CT >= this.drivers[index].ckMin) && (CT <= this.drivers[index].ckMax)) {
                    this.modbusServer.sendMessage(cmd);//sent to modbus
                    this.replyWebseverOk(replyType.okCT);
                }
                else {
                    this.replyWebseverFail(replyType.failCT);
                }
            }
            else if ((brightness >= this.drivers[index].brightnessMin) && (brightness <= this.drivers[index].brightnessMax)) {

                if ((CT >= this.drivers[index].ckMin) && (CT <= this.drivers[index].ckMax)) {

                    this.modbusServer.sendMessage(cmd);//sent to modbus
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
    exeWebCmdPostSwitchOnOffAll(cmd: DTCMD.iCmd) {
        this.modbusServer.sendMessage(cmd);//sent to modbus
        this.replyWebseverOk(replyType.okSwitchOnOFF);
    }
    //----------------------------------------------------------------------------------------------------------
    exeWebCmdPostSwitchOnOff(index: number, cmd: DTCMD.iCmd) {

        let switchOnOff: number = cmd.cmdData.switchOnOff;
        let driverID: number = cmd.cmdData.driverId;

        if (index >= 0) {
            this.modbusServer.sendMessage(cmd);//sent to modbus
            this.replyWebseverOk(replyType.okSwitchOnOFF);
        }
        else {
            this.replyWebseverFail(replyType.failSwitchOnOFF);
        }
    }
    //----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperatureAll(cmd: DTCMD.iCmd) {

        let flag: boolean = true;
        for (let index: number = 0; index < this.drivers.length; index++) {

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
            this.modbusServer.sendMessage(cmd);//sent to modbus
            this.replyWebseverOk(replyType.okCT);
        }
        else {
            this.replyWebseverFail(replyType.failCT);
        }
    }
    //-----------------------------------------------------------------------------
    exeWebCmdPostDimColoXY(index: number, cmd: DTCMD.iCmd) {
        if (index >= 0) {
            this.modbusServer.sendMessage(cmd);//sent to modbus
            this.replyWebseverFail(replyType.okXY);
        }
        else {
            this.replyWebseverFail(replyType.failID);
        }
    }
    //---------------------------------------------------------------------------------------
    //delay msec function
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }


    //------------------------------------------------------------------------------------
    webtest() {

        let devPkg: iDevPkg[] = [];


        let deviceInfo1: iDevInfo = {};
        deviceInfo1.type = typesDevice.tag;
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


        let tag: iDevPkg = {};
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

        let rxLightInfo1: iRxLightInfo = { recLightID: deviceInfo1.recLightID, rssi: deviceInfo1.rssi };
        let rxLightInfo2: iRxLightInfo = { recLightID: 2, rssi: -70 };
        let rxLightInfo3: iRxLightInfo = { recLightID: 3, rssi: -90 };
        tag.rxLightInfo.push(rxLightInfo1);
        tag.rxLightInfo.push(rxLightInfo2);
        tag.rxLightInfo.push(rxLightInfo3);
        tag.rxLightCount = tag.rxLightInfo.length;


        //
        //this.devPkgMember.push(devPkg);//save devPkg into devPkgMember


        devPkg.push(tag);


        let deviceInfo2: iDevInfo = {};
        deviceInfo2.type = typesDevice.dripStand;
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



        let dripstand: iDevPkg = {};
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


        let rxLightInfo4: iRxLightInfo = { recLightID: deviceInfo2.recLightID, rssi: deviceInfo2.rssi };
        let rxLightInfo5: iRxLightInfo = { recLightID: 2, rssi: -65 };
        let rxLightInfo6: iRxLightInfo = { recLightID: 3, rssi: -90 };
        dripstand.rxLightInfo.push(rxLightInfo1);
        dripstand.rxLightInfo.push(rxLightInfo2);
        dripstand.rxLightInfo.push(rxLightInfo3);
        dripstand.rxLightCount = dripstand.rxLightInfo.length;


        devPkg.push(dripstand);

        let newGWInf: iGwInf = {};
        newGWInf.GatewaySeq = this.gwSeq++;
        newGWInf.GatewayIP = this.GwIP;
        newGWInf.GatewayMAC = this.GwMAC;
        newGWInf.Datetime = (new Date()).toLocaleString();
        newGWInf.devPkgCount = devPkg.length;
        newGWInf.devPkgMember = devPkg;

        this.latestNGwInf.push(newGWInf);
    }
}




let controlProcess = new ControlProcess();

















