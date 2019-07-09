import * as DTCMD from './dataTypeCmd';
import * as Net from 'net';//import socket module
import * as fs from 'fs';

let configfilePath = './config.json';

export class SocketModbusServer {
    socketModbusServer: Net.Server = null;
    socket: Net.Socket = null;
    scoketModbusServerPort: number;
    scoketModbusServerIP: string;
//--------------------------------------------------------------------------------
    constructor() {
        console.log("start socket server of socketModbusServer");
        this.startServer();
    }
//-------------------------------------------------------------------------------    
    async startServer() {
        await this.readConfigFile();
        this.configureServer();
    }
//----------------------------------------------------------------------------------
    readConfigFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.scoketModbusServerPort = configJson.scoketModbusServerPort;
            this.scoketModbusServerIP = configJson.scoketModbusServerIP;
            resolve(true);
        });
    }
//-----------------------------------------------------------------------------------
    configureServer() {
        this.socketModbusServer = Net.createServer();//create server
        this.socketModbusServer.listen(this.scoketModbusServerPort, this.scoketModbusServerIP,()=>{
            console.log('socketModbusServer started,ip:'+ this.scoketModbusServerIP+',port:'+this.scoketModbusServerPort);
        });//liseten ip and port

        this.socketModbusServer.on('close', () => {
            console.log((new Date()).toLocaleString() + 'socketModbusServer  is now closed');
        });
    }
//-------------------------------------------------------------------------------------
    sendMessage(cmd: DTCMD.iCmd) {
        this.socket.write(JSON.stringify(cmd));
    }
//--------------------------------------------------------------------------------------


}