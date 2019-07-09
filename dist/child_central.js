"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PS = require("process");
//import { PgControl } from './pgControl';
const Net = require("net"); //import socket module
const datatype_1 = require("./datatype");
class CentralControll {
    constructor() {
        this.socketRS485 = null;
        this.socketWebserver = null;
        this.socketLocation = null;
        this.startPS();
        this.rs485ServerStart(); //start RS485 socket and wait for connection
        //  this.webserverStart();//start webserver socket  and wait for connection
        //  this.locationServerStart();//start location server
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
    rs485ServerStart() {
        this.timeString = (new Date()).toLocaleString();
        console.log(this.timeString + ' RS485 server start');
        // create RS485 server 
        Net.createServer((socket) => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 Server:RS485 client connected.' + 'IP=' + socket.localAddress + '/Port=' + socket.localPort.toString());
            this.socketRS485 = socket; //record socket entity
            //ble client disconnected
            socket.on('close', (error) => {
                console.log('server:RS485 client disconnected!');
                this.socketRS485 = null;
            });
            // receive data from RS485 client
            socket.on('data', (data) => {
                //  this.parserRS485ClientData(data);
            });
        }).listen(datatype_1.cpControl.PORT_RS485_Central, datatype_1.cpControl.HOST); //listen host
    }
    webserverStart() {
        this.timeString = (new Date()).toLocaleString();
        console.log(this.timeString + ' Webserver server start');
        // create RS485 server 
        Net.createServer((socket) => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Webserver Server:Webserver client connected.' + 'IP=' + socket.localAddress + '/Port=' + socket.localPort.toString());
            this.socketWebserver = socket; //record socket entity
            //ble client disconnected
            socket.on('close', (error) => {
                console.log('server:Webserver client disconnected!');
                this.socketWebserver = null;
            });
            // receive data from RS485 client
            socket.on('data', (data) => {
                //this.parserWebserverClientData(data);
            });
        }).listen(datatype_1.cpControl.PORT_Webserver_Central, datatype_1.cpControl.HOST); //listen host
    }
    locationServerStart() {
        this.timeString = (new Date()).toLocaleString();
        console.log(this.timeString + ' Location server is started');
        // create location server 
        Net.createServer((socket) => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Location Server:Location client connected.' + 'IP=' + socket.localAddress + '/Port=' + socket.localPort.toString());
            this.socketLocation = socket; //record socket entity
            //ble client disconnected
            socket.on('close', (error) => {
                console.log('server:Location client disconnected!');
                this.socketLocation = null;
            });
            // receive data from RS485 client
            socket.on('data', (data) => {
                //this.parserWebserverClientData(data);
            });
        }).listen(datatype_1.cpControl.PORT_Location_Central, datatype_1.cpControl.HOST); //listen host
    }
    //parser data from ble client
    parserRS485ClientData(data) {
        //  let rx: InterfaceRS485 = JSON.parse(data);
        /*
        let protocolData: InterfaceProtocol =
        {
            cmdtype: rx.cmdtype,
            cmdData: rx.cmdData
        }
    
        if (protocolData.cmdtype == 'SensorHT') {
            let content = protocolData.cmdData.toString().split(";");
            temperature = parseInt(content[0]);
            humidity = parseInt(content[1]);
            console.log((new Date().toLocaleString()));
            console.log('temperature:' + temperature.toString(10));
            console.log('humidity:' + humidity.toString(10));
            write2BleClient('replyOK', 'ok');
    
            //codeing for saving data to database and updating sensor status here
    
        }
        else if (protocolData.cmdtype == 'SensorPIR') {
            let content = protocolData.cmdData.toString().split(";");
            pirValue = parseInt(content[0]);
            console.log((new Date().toLocaleString()));
            console.log('PIR:' + pirValue);
            write2BleClient('replyOK', 'ok');
            //codeing for saving data to database and updating sensor status here
        }
        */
    }
    //parser data from ble client
    parserWebserverClientData(data) {
        //  let rx: InterfaceRS485 = JSON.parse(data);
        /*
        let protocolData: InterfaceProtocol =
        {
            cmdtype: rx.cmdtype,
            cmdData: rx.cmdData
        }
    
        if (protocolData.cmdtype == 'SensorHT') {
            let content = protocolData.cmdData.toString().split(";");
            temperature = parseInt(content[0]);
            humidity = parseInt(content[1]);
            console.log((new Date().toLocaleString()));
            console.log('temperature:' + temperature.toString(10));
            console.log('humidity:' + humidity.toString(10));
            write2BleClient('replyOK', 'ok');
    
            //codeing for saving data to database and updating sensor status here
    
        }
        else if (protocolData.cmdtype == 'SensorPIR') {
            let content = protocolData.cmdData.toString().split(";");
            pirValue = parseInt(content[0]);
            console.log((new Date().toLocaleString()));
            console.log('PIR:' + pirValue);
            write2BleClient('replyOK', 'ok');
            //codeing for saving data to database and updating sensor status here
        }
        */
    }
}
let centralControll = new CentralControll(); //process control
//let pg = new PgControl();//process control
//# sourceMappingURL=child_central.js.map