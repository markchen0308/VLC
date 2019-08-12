"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Net = require("net"); //import socket module
const fs = require("fs");
let configfilePath = './config.json';
class SocketRemoteClient {
    constructor() {
        //console.log("start socket client to wait remote socket server");
        this.socket = null;
        this.flagServerStatus = false;
    }
    setClientSeverInfo(ip, port) {
        this.socketRemoteServerIP = ip;
        this.socketRemoteServerPort = port;
    }
    //-----------------------------------------------------------------------
    async startRemoteClient() {
        // await this.readConfigFile();//read config.json
        this.socketRemoteClient = null;
        this.configureClient(); // connect to modbus server
    }
    //----------------------------------------------------------------------------------
    readConfigFile() {
        return new Promise((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8'); //read config.json file
            let configJson = JSON.parse(configJsonFile); //parse coonfig.json file
            this.socketRemoteServerIP = configJson.socketRemoteServerIP;
            this.socketRemoteServerPort = configJson.socketRemoteServerPort;
            resolve(true);
        });
    }
    //-----------------------------------------------------------------------------------
    configureClient() {
        this.socketRemoteClient = Net.connect(this.socketRemoteServerPort, this.socketRemoteServerIP, () => {
            //console.log(`modbusClient connected to: ${this.socketRemoteClient.address} :  ${this.socketRemoteClient.localPort}`);
            console.log("Remote server connected. IP:" + this.socketRemoteServerIP + ',port:this.socketRemoteServerPort');
            this.flagServerStatus = true;
            this.sendMsg2Server("Hello,I'm VLC client\n"); //sent cmd data to server
        });
        //this.socketRemoteClient.setEncoding('utf8');
        this.socketRemoteClient.on('close', () => {
            console.log('remote server disconnected!');
            this.flagServerStatus = false;
        });
        // received server cmd data \
        this.socketRemoteClient.on('data', (data) => {
            //let temp: any = data;
            //let cmd: DTCMD.iCmd = JSON.parse(temp);
            //this.parseControlServerCmd(cmd);
            console.log('Get remote server data:' + data);
        });
    }
    //-----------------------------------------------------------------------------------
    isRemoteServerHolding() {
        return this.flagServerStatus;
    }
    //-----------------------------------------------------------------------------------
    sendMsg2Server(msg) {
        //console.log("sent msg")
        this.socketRemoteClient.write(msg);
    }
}
exports.SocketRemoteClient = SocketRemoteClient;
//# sourceMappingURL=socketRemoteClient.js.map