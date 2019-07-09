"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
const Net = require("net"); //import socket module
const datatype_1 = require("./datatype");
class WEBSERVER_CONTROL {
    constructor() {
        this.socketClient = null;
        this.socketClient = new Net.Socket();
        this.startPS();
        this.StartWebserverClient(); //connect to 
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
    StartWebserverClient() {
        //get reply information from server 
        this.socketClient.on('data', (data) => {
            // client.destroy();//disconnect
            //this.parserRS485ServerData(data);
        });
        //connection closed
        this.socketClient.on('close', () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Webserver Client has been closed');
        });
        //create connection
        this.socketClient.connect(datatype_1.cpControl.PORT_Webserver_Central, datatype_1.cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Webserver client has been connected to server at IP=' + datatype_1.cpControl.HOST + ';Port=' + datatype_1.cpControl.PORT_Webserver_Central);
        });
    }
    parserWebserverData(data) {
        // let rx: InterfaceRS485 = JSON.parse(data);
    }
}
let webserverControl = new WEBSERVER_CONTROL(); //process control
//# sourceMappingURL=child_webserver.js.map