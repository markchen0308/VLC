import * as PS from 'process';
import * as Net from 'net';//import socket module
import { InterfaceCP,  cpControl } from './datatype'

class WEBSERVER_CONTROL {
    socketClient: Net.Socket = null;
    timeString: string;

    constructor() {
        this.socketClient = new Net.Socket();
        this.startPS();
        this.StartWebserverClient();//connect to 

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
        this.socketClient.connect(cpControl.PORT_Webserver_Central, cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' Webserver client has been connected to server at IP=' + cpControl.HOST + ';Port=' + cpControl.PORT_Webserver_Central);
        });
    }


    parserWebserverData(data: any) {
       // let rx: InterfaceRS485 = JSON.parse(data);
    }

}


let webserverControl:WEBSERVER_CONTROL = new WEBSERVER_CONTROL();//process control


