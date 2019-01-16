import { SocketWebServer } from './socketWebServer';
import { SocketModbusServer } from './socketModbusServer';
import * as network from 'network';
import * as DTCMD from './dataTypeCmd';
import { PgControl } from './pgControl'
import { iDriver, iDevInfo, iReadableRegister, iDripstand, iDevPkg, iGwInf, iGwPkg,iWebPkg ,iRxLightInfo} from './dataTypeModbus';
import { holdingRegisterAddress,inputregisterAddress,typesDevice,deviceLength,devAddress,otherDripStandAddress,modbusCmd,webCmd } from './dataTypeModbus';



let saveDatabasePeriod = 6000;//60 sec
let MaxDataQueueLength = 3;




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
    fSaveDbEn:boolean;
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
        
        this.webtest();//test webserver
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
                let cmd: DTCMD.iCmd = JSON.parse(data);
                this.parseModbusCmd(cmd);
            })

            this.modbusServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });

            this.modbusServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }
    //------------------------------------------------------------------------------
    parseModbusCmd(cmd: DTCMD.iCmd) {

        switch (cmd.cmdtype) {
            case modbusCmd.driverInfo://driverInfo[]
                this.drivers = cmd.cmdData;//get driverInfo[] and save it
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
        this.fSaveDbEn=true;
        //peroid timer 
        this.pSaveDB = setInterval(() => {
            if(this.fSaveDbEn==true)
            {
                this.saveHistory2DB();
            }
            else{
                clearInterval(this.pSaveDB);//stop timer
            }
        }, saveDatabasePeriod);//execute cmd per saveDatabasePeriod msec
    }
    //---------------------------------------------------------------
    replyWebCmdGetTodayLast() {

        let webPkg:iWebPkg={};

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

            webPkg.reply=1;
            webPkg.msg=gwPkg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
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
            webPkg.reply=1;
            webPkg.msg=gwPkg;
            this.webServer.sendMessage(JSON.stringify(webPkg));
        }
    }

    //---------------------------------------------------------------------------
    replyWebCmdGetTodayAfter(seqID: number) {
        let webPkg:iWebPkg={};
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })

    }

    //---------------------------------------------------------------------------------------
    replyWebCmdGetToday() {
        let webPkg:iWebPkg={};
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })
    }
    //----------------------------------------------------------------------------------------
    replyWebCmdGetYesterday() {
        let webPkg:iWebPkg={};
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })
    }
    //---------------------------------------------------------------------------------------
    replyWebCmdGetSomeDate(year: number, month: number, date: number) {
        let webPkg:iWebPkg={};
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
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
                    webPkg.reply=1;
                    webPkg.msg=gwPkg;
                    this.webServer.sendMessage(JSON.stringify(webPkg));
                }
            })
    }
    //---------------------------------------------------------------------------------
    exeWebCmdPostReset() {
        let webPkg:iWebPkg={};
        webPkg.reply=1;
        webPkg.msg="ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostBrightness(brightness: number, driverID: number) {
        let webPkg:iWebPkg={};
        webPkg.reply=1;
        webPkg.msg="ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }
    //-----------------------------------------------------------------------------------
    exeWebCmdPostDimTemperature(brightness: number, driverID: number, CT: number) {
        let webPkg:iWebPkg={};
        webPkg.reply=1;
        webPkg.msg="ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }

    //-----------------------------------------------------------------------------
    exeWebCmdPostDimColoXY(brightness: number, driverID: number, colorX: number, colorY: number) {
        let webPkg:iWebPkg={};
        webPkg.reply=1;
        webPkg.msg="ok";
        this.webServer.sendMessage(JSON.stringify(webPkg));
    }


    //---------------------------------------------------------------------------------------
    //delay msec function
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }


    //------------------------------------------------------------------------------------
    webtest()
    {





        let devPkg:iDevPkg[]=[];
       

       let  deviceInfo1: iDevInfo={};
       deviceInfo1.type=typesDevice.tag;
       deviceInfo1.mac="123456789ABC";
       deviceInfo1.seq=1;
       deviceInfo1.lId1=1;
       deviceInfo1.lId2=2;
       deviceInfo1.br1=100;
       deviceInfo1.br2=50;
       deviceInfo1.rssi=-50;
       deviceInfo1.labelX=10;
       deviceInfo1.labelY=1;
       deviceInfo1.labelH=150;
       deviceInfo1.Gx=1;
       deviceInfo1.Gy=0;
       deviceInfo1.Gz=-1;
       deviceInfo1.batPow=90;
       deviceInfo1.recLightID=1;
       deviceInfo1.other={};


       let tag: iDevPkg ={};
       tag.type=deviceInfo1.type;
       tag.mac=deviceInfo1.mac;
       tag.seq=deviceInfo1.seq;
       tag.lId1=deviceInfo1.lId1;
       tag.lId2=deviceInfo1.lId2;
       tag.br1=deviceInfo1.br1;
       tag.br2=deviceInfo1.br2;
       tag.Gx=deviceInfo1.Gx;
       tag.Gy=deviceInfo1.Gy;
       tag.Gz=deviceInfo1.Gz;
       tag.batPow=deviceInfo1.batPow;
       tag.labelY=deviceInfo1.labelX;
       tag.labelY=deviceInfo1.labelY;
       tag.other=deviceInfo1.other;
       tag.rxLightInfo=[];

       let rxLightInfo1:iRxLightInfo={recLightID:deviceInfo1.recLightID,rssi:deviceInfo1.rssi};
       let rxLightInfo2:iRxLightInfo={recLightID:2,rssi:-70};
       let rxLightInfo3:iRxLightInfo={recLightID:3,rssi:-90};
       tag.rxLightInfo.push(rxLightInfo1);
       tag.rxLightInfo.push(rxLightInfo2);
       tag.rxLightInfo.push(rxLightInfo3);
       tag.rxLightCount= tag.rxLightInfo.length;


       //
       //this.devPkgMember.push(devPkg);//save devPkg into devPkgMember


       devPkg.push(tag);


       let  deviceInfo2: iDevInfo={};
       deviceInfo2.type=typesDevice.dripStand;
       deviceInfo2.mac="1122334455AB";
       deviceInfo2.seq=1;
       deviceInfo2.lId1=1;
       deviceInfo2.lId2=2;
       deviceInfo2.br1=100;
       deviceInfo2.br2=50;
       deviceInfo2.rssi=-55;
       deviceInfo2.labelX=10;
       deviceInfo2.labelY=1;
       deviceInfo2.labelH=150;
       deviceInfo2.Gx=1;
       deviceInfo2.Gy=0;
       deviceInfo2.Gz=-1;
       deviceInfo2.batPow=90;
       deviceInfo2.recLightID=1;
       deviceInfo2.other={weight:900,speed:20};



       let dripstand:iDevPkg={};
       dripstand.type=deviceInfo2.type;
       dripstand.mac=deviceInfo2.mac;
       dripstand.seq=deviceInfo2.seq;
       dripstand.lId1=deviceInfo2.lId1;
       dripstand.lId2=deviceInfo2.lId2;
       dripstand.br1=deviceInfo2.br1;
       dripstand.br2=deviceInfo2.br2;
       dripstand.Gx=deviceInfo2.Gx;
       dripstand.Gy=deviceInfo2.Gy;
       dripstand.Gz=deviceInfo2.Gz;
       dripstand.batPow=deviceInfo2.batPow;
       dripstand.labelY=deviceInfo2.labelX;
       dripstand.labelY=deviceInfo2.labelY;
       dripstand.other=deviceInfo2.other;
       dripstand.rxLightInfo=[];
       

       let rxLightInfo4:iRxLightInfo={recLightID:deviceInfo2.recLightID,rssi:deviceInfo2.rssi};
       let rxLightInfo5:iRxLightInfo={recLightID:2,rssi:-65};
       let rxLightInfo6:iRxLightInfo={recLightID:3,rssi:-90};
       dripstand.rxLightInfo.push(rxLightInfo1);
       dripstand.rxLightInfo.push(rxLightInfo2);
       dripstand.rxLightInfo.push(rxLightInfo3);
       dripstand.rxLightCount= dripstand.rxLightInfo.length;

        
       devPkg.push(dripstand);
        
        let newGWInf:iGwInf={};
        newGWInf.GatewaySeq=this.gwSeq++;
        newGWInf.GatewayIP=this.GwIP;
        newGWInf.GatewayMAC=this.GwMAC;
        newGWInf.Datetime=(new Date()).toLocaleString();
        newGWInf.devPkgCount=devPkg.length;
        newGWInf.devPkgMember=devPkg;

        this.latestNGwInf.push(newGWInf);
    }
}




let controlProcess = new ControlProcess();

















