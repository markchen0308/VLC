import * as PS from 'process';
import * as Net from 'net';//import socket module
import { InterfaceCP, cpControl } from './datatype'





class LOCATION_CONTROL {

    SocketRS485: Net.Socket = null;
    socketClient: Net.Socket = null;
    timeString: string;

    constructor() {
        this.socketClient = new Net.Socket();
        this.startPS();
        this.startLocationClient();//connect to central
        this.startRs485LocationServer();//start location socket server to RS485 

    }

    startPS() {
        //msg from main process
        PS.on('message', (msg: InterfaceCP) => {

            if (cpControl.cmdCPCompare(msg, cpControl.cmdStartCP())) //compare reply of cmd
            {
                PS.send(cpControl.cmdStartCPReplyOK());//response process is started sucessfully
            }
            else {
                PS.send(cpControl.cmdStartCPReplyFail());////response process is started unsucessfully
            }
        })
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
        this.socketClient.connect(cpControl.PORT_Location_Central, cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Location Client has been connected to server at IP=' + cpControl.HOST + ';Port=' + cpControl.PORT_Location_Central);
        });
    }

    startRs485LocationServer() {
        this.timeString = (new Date()).toLocaleString();
        console.log(this.timeString + ' Location for RS485 socket server start');
        // create RS485 server 
        Net.createServer((socket) => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Location for RS485 Server:RS485 client connected.' + 'IP=' + socket.localAddress + '/Port=' + socket.localPort.toString());
            this.SocketRS485 = socket;//record socket entity

            //ble client disconnected
            socket.on('close', (error) => {
                this.timeString = (new Date()).toLocaleString();
                console.log(this.timeString + ' Location for RS485 Server:RS485 client disconnected!')
                this.SocketRS485 = null;
            })

            // receive data from RS485 client
            socket.on('data', (data) => {
                //  this.parserRS485ClientData(data);
            });
        }).listen(cpControl.PORT_Location_RS485, cpControl.HOST);//listen host
    }


    parserLocationData(data: any) {
        // let rx: InterfaceRS485 = JSON.parse(data);
    }

}


let locationControl: LOCATION_CONTROL = new LOCATION_CONTROL();//process control


