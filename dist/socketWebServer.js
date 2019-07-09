"use strict";
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
        await this.readConfigFile(); //read webserver setting
        this.configureServer(); //set up webserver 
    }
    readConfigFile() {
        return new Promise((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8'); //read config.json file
            let configJson = JSON.parse(configJsonFile); //parse coonfig.json file
            this.scoketWebServerPort = configJson.scoketWebServerPort; //get port
            this.socketWebServerIP = configJson.socketWebServerIP; //get ip
            resolve(true);
        });
    }
    configureServer() {
        this.socketWebserver = Net.createServer(); //create server
        this.socketWebserver.listen(this.scoketWebServerPort, this.socketWebServerIP, () => {
            console.log('scoketWebServer started,ip:' + this.socketWebServerIP + ',port:' + this.scoketWebServerPort);
        }); //liseten ip and port
        this.socketWebserver.on('close', () => {
            console.log((new Date()).toLocaleString() + 'socketwebserver  is now closed');
        });
    }
    sendMessage(res) {
        this.socket.write(JSON.stringify(res));
    }
}
exports.SocketWebServer = SocketWebServer;
//# sourceMappingURL=socketWebServer.js.map