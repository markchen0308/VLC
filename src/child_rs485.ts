import * as PS from 'process';
import * as Net from 'net';//import socket module
import { InterfaceCP, cpControl } from './datatype'
import * as CP from 'child_process';
import * as util from 'util';



class RS485_CONTROL {
    exec = util.promisify(CP.exec);
    socketRs485CentralClient: Net.Socket = null;
    socketRs485LocationClient: Net.Socket = null;
    timeString: string;
    rs485DeviceName:string='ttyUSB0';

    constructor() {

        this.checkRS485Device();//check device is ok
        this.socketRs485CentralClient = new Net.Socket();
        this.socketRs485LocationClient = new Net.Socket();
        this.startPS();//start process control
        this.StartRS485CentralClient();//connect to rs485 central socket server
        this.StartRS485LocationClient();//connect to rs485 location socket server

    }

    async checkRS485Device()
    {
        let rx= await this.exec('ls /dev/ | grep ' +this.rs485DeviceName);
        console.log(rx.stdout);
        if(rx.stdout.includes(this.rs485DeviceName))
        {
            console.log('ttyUSB0 is exist!');
            rx= await this.exec('chmod +x /dev/ttyUSB0');//set  executable

        }
        else
        {
            console.log('ttyUSB0 is not exist!');
        }
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
        this.socketRs485CentralClient.connect(cpControl.PORT_RS485_Central, cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 central client has been connected to server at IP=' + cpControl.HOST + ';Port=' + cpControl.PORT_RS485_Central);
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
        this.socketRs485LocationClient.connect(cpControl.PORT_Location_RS485, cpControl.HOST, () => {
            this.timeString = (new Date()).toLocaleString();
            console.log(this.timeString + ' RS485 location client has been connected to server at IP=' + cpControl.HOST + ';Port=' + cpControl.PORT_Location_RS485);
        });
    }

    parserRS485ServerData(data: any) {
        // let rx: InterfaceRS485 = JSON.parse(data);
    }

}


let rs485Control: RS485_CONTROL = new RS485_CONTROL();//process control
