import * as DTCMD from './dataTypeCmd';
import * as Net from 'net';//import socket module
import * as fs from 'fs';

let configfilePath = './config.json';

export class SocketWebServer {
    socketWebserver: Net.Server = null;
    socket: Net.Socket = null;
    scoketWebServerPort: number;
    socketWebServerIP: string;

    constructor() {
        console.log("start socket server of webserver");
        this.startServer();
    }


    async startServer() {
        await this.readConfigFile();//read webserver setting
        this.configureServer();//set up webserver 
    }

    readConfigFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.scoketWebServerPort = configJson.scoketWebServerPort;//get port
            this.socketWebServerIP = configJson.socketWebServerIP;//get ip
            resolve(true);
        });
    }

    configureServer() {

        this.socketWebserver = Net.createServer();//create server
        this.socketWebserver.listen(this.scoketWebServerPort, this.socketWebServerIP,()=>{
            console.log('scoketWebServer started,ip:'+ this.socketWebServerIP+',port:'+this.scoketWebServerPort);
        });//liseten ip and port

        this.socketWebserver.on('close', () => {
            console.log((new Date()).toLocaleString() + 'socketwebserver  is now closed');
        });
    }
    
    sendMessage(res: any) {
        this.socket.write(JSON.stringify(res));
    }



}