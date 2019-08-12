"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
const Net = require("net"); //import socket module
const datatype_1 = require("./datatype");
const CP = require("child_process");
const util = require("util");
class RS485_CONTROL {
    constructor() {
        this.exec = util.promisify(CP.exec);
        this.socketRs485CentralClient = null;
        this.socketRs485LocationClient = null;
        this.rs485DeviceName = 'ttyUSB0';
        this.checkRS485Device(); //check device is ok
        this.socketRs485CentralClient = new Net.Socket();
        this.socketRs485LocationClient = new Net.Socket();
        this.startPS(); //start process control
        this.StartRS485CentralClient(); //connect to rs485 central socket server
        this.StartRS485LocationClient(); //connect to rs485 location socket server
    }
    async checkRS485Device() {
        let rx = await this.exec('ls /dev/ | grep ' + this.rs485DeviceName);
        console.log(rx.stdout);
        if (rx.stdout.includes(this.rs485DeviceName)) {
            console.log('ttyUSB0 is exist!');
            rx = await this.exec('chmod +x /dev/ttyUSB0'); //set  executable
        }
        else {
            console.log('ttyUSB0 is not exist!');
        }
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
    StartRS485CentralClient() {
        //get reply information from server 
        this.socketRs485CentralClient.on('data', (data) => {
            // client.destroy();//disconnect
            //this.parserRS485ServerData(data);
        });
        //connection closed
        this.socketRs485CentralClient.on('close', () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 central client has been closed');
        });
        //create connection
        this.socketRs485CentralClient.connect(datatype_1.cpControl.PORT_RS485_Central, datatype_1.cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 central client has been connected to server at IP=' + datatype_1.cpControl.HOST + ';Port=' + datatype_1.cpControl.PORT_RS485_Central);
        });
    }
    StartRS485LocationClient() {
        //get reply information from server 
        this.socketRs485LocationClient.on('data', (data) => {
            // client.destroy();//disconnect
            //this.parserRS485ServerData(data);
        });
        //connection closed
        this.socketRs485LocationClient.on('close', () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 location client has been closed');
        });
        //create connection
        this.socketRs485LocationClient.connect(datatype_1.cpControl.PORT_Location_RS485, datatype_1.cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 location client has been connected to server at IP=' + datatype_1.cpControl.HOST + ';Port=' + datatype_1.cpControl.PORT_Location_RS485);
        });
    }
    parserRS485ServerData(data) {
        // let rx: InterfaceRS485 = JSON.parse(data);
    }
}
let rs485Control = new RS485_CONTROL(); //process control
//# sourceMappingURL=child_rs485.js.map