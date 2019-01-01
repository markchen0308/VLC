"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketWebServer_1 = require("./socketWebServer");
const pgControl_1 = require("./pgControl");
class ControlProcess {
    constructor() {
        this.webServer = new socketWebServer_1.SocketWebServer();
        this.pgCntrol = new pgControl_1.PgControl();
        setTimeout(() => {
            this.listenWebserver();
        }, 1000);
    }
    listenWebserver() {
        this.webServer.socketWebserver.on("connection", (socket) => {
            this.webServer.socket = socket;
            let clientName = `${this.webServer.socket.remoteAddress}:${this.webServer.socket.remotePort}`;
            console.log("connection from " + clientName);
            this.webServer.socket.on('data', (data) => {
                let cmd = JSON.parse(data);
                console.dir(cmd);
                this.webServer.sendMessage(cmd);
            });
            this.webServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });
            this.webServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }
    async parseCmdFromwebServer() {
    }
}
exports.ControlProcess = ControlProcess;
let controlProcess = new ControlProcess();
//# sourceMappingURL=controlProcess.js.map