"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
const Net = require("net"); //import socket module
const datatype_1 = require("./datatype");
class LOCATION_CONTROL {
    constructor() {
        this.SocketRS485 = null;
        this.socketClient = null;
        this.socketClient = new Net.Socket();
        this.startPS();
        this.startLocationClient(); //connect to central
        this.startRs485LocationServer(); //start location socket server to RS485 
    }
    startPS() {
        //msg from main process
        PS.on('message', (msg) => {
            if (datatype_1.cpControl.cmdCPCompare(msg, datatype_1.cpControl.cmdStartCP())) //compare reply of cmd
             {
                PS.send(datatype_1.cpControl.cmdStartCPReplyOK()); //response process is started sucessfully
            }
            else {
                PS.send(datatype_1.cpControl.cmdStartCPReplyFail()); ////response process is started unsucessfully
            }
        });
    }
    startLocationClient() {
        //get reply information from server 
        this.socketClient.on('data', (data) => {
            // client.destroy();//disconnect
            //this.parserRS485ServerData(data);
        });
        //connection closed
        this.socketClient.on('close', () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Location Client has been closed');
        });
        //create connection
        this.socketClient.connect(datatype_1.cpControl.PORT_Location_Central, datatype_1.cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Location Client has been connected to server at IP=' + datatype_1.cpControl.HOST + ';Port=' + datatype_1.cpControl.PORT_Location_Central);
        });
    }
    startRs485LocationServer() {
        this.timeString = (new Date()).toLocaleString();
        console.log(this.timeString + ' Location for RS485 socket server start');
        // create RS485 server 
        Net.createServer((socket) => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Location for RS485 Server:RS485 client connected.' + 'IP=' + socket.localAddress + '/Port=' + socket.localPort.toString());
            this.SocketRS485 = socket; //record socket entity
            //ble client disconnected
            socket.on('close', (error) => {
                this.timeString = (new Date()).toLocaleString();
                console.log(this.timeString + ' Location for RS485 Server:RS485 client disconnected!');
                this.SocketRS485 = null;
            });
            // receive data from RS485 client
            socket.on('data', (data) => {
                //  this.parserRS485ClientData(data);
            });
        }).listen(datatype_1.cpControl.PORT_Location_RS485, datatype_1.cpControl.HOST); //listen host
    }
    parserLocationData(data) {
        // let rx: InterfaceRS485 = JSON.parse(data);
    }
}
let locationControl = new LOCATION_CONTROL(); //process control
//# sourceMappingURL=child_location.js.map