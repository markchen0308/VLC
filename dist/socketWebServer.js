"use strict";
//let fs = require('fs');
Object.defineProperty(exports, "__esModule", { value: true });
const Net = require("net"); //import socket module
const fs = require("fs");
let configfilePath = './config.json';
class SocketWebServer {
    constructor() {
        this.socketWebserver = null;
        this.socket = null;
        console.log("start socket server of webserver");
        this.startServer();
    }
    async startServer() {
        await this.readConfigFile();
        this.configureServer();
    }
    readConfigFile() {
        return new Promise((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8'); //read config.json file
            let configJson = JSON.parse(configJsonFile); //parse coonfig.json file
            this.scoketWebServerPort = configJson.scoketWebServerPort;
            this.socketWebServerIP = configJson.socketWebServerIP;
            resolve(true);
        });
    }
    configureServer() {
        //get reply information from server 
        //this.socketWebserver.on('data', (data) => {
        //       let cmdString:any=data
        //       let cmd=JSON.parse(cmdString);
        //      console.dir(cmd);
        // });
        this.socketWebserver = Net.createServer(); //create server
        this.socketWebserver.listen(this.scoketWebServerPort, this.socketWebServerIP, () => {
            console.log('scoketWebServer started,ip:' + this.socketWebServerIP + ',port:' + this.scoketWebServerPort);
        }); //liseten ip and port
        this.socketWebserver.on('close', () => {
            console.log((new Date()).toLocaleString() + 'socketwebserver  is now closed');
        });
    }
    sendMessage(cmd) {
        this.socket.write(JSON.stringify(cmd));
    }
}
exports.SocketWebServer = SocketWebServer;
//# sourceMappingURL=socketWebServer.js.map