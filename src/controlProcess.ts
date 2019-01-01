import { SocketWebServer } from './socketWebServer';
import { SocketModbusServer } from './socketModbusServer'
import { iCmd } from './dataTypeCmd'
import { PgControl } from './pgControl'



export class ControlProcess {
    webServer: SocketWebServer = new SocketWebServer();
    modbusServer: SocketModbusServer = new SocketModbusServer();
    pgCntrol: PgControl = new PgControl();

    constructor() {
        setTimeout(() => {
            this.listenWebserver();
        }, 1000);
    }

    listenWebserver() {
        this.webServer.socketWebserver.on("connection", (socket) => {
            this.webServer.socket = socket;
            let clientName = `${this.webServer.socket.remoteAddress}:${this.webServer.socket.remotePort}`;
            console.log("connection from " + clientName);

            this.webServer.socket.on('data', (data: any) => {
                let cmd = JSON.parse(data);
                console.dir(cmd);
                this.webServer.sendMessage(cmd);
            })

            this.webServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });

            this.webServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }


    listenModbusServer() {
        this.modbusServer.socketModbusServer.on("connection", (socket) => {
            this.modbusServer.socket = socket;
            let clientName = `${this.modbusServer.socket.remoteAddress}:${this.modbusServer.socket.remotePort}`;
            console.log("connection from " + clientName);

            this.modbusServer.socket.on('data', (data: any) => {
                let cmd = JSON.parse(data);
                console.dir(cmd);
                //this.webServer.sendMessage(cmd);
            })

            this.modbusServer.socket.on('close', () => {
                console.log(`connection from ${clientName} closed`);
            });

            this.modbusServer.socket.on('error', (err) => {
                console.log(`Connection ${clientName} error: ${err.message}`);
            });
        });
    }








    async  parseCmdFromWebServer() {

    }
}

let controlProcess = new ControlProcess();

















