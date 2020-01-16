import * as Net from 'net';//import socket module
import * as fs from 'fs';
let configfilePath = './config.json';
export class SocketRemoteClient {

    socketRemoteClient: Net.Socket = null;
    socket: Net.Socket = null;
    socketRemoteServerPort: number;
    socketRemoteServerIP: string;
    flagServerStatus: boolean = false;
    flagTest:boolean=false;
    timeStart:number;
    timeEnd:number;
    deltaTime:number;


    constructor() {
        //console.log("start socket client to wait remote socket server");

    }

    setClientSeverInfo(ip: string, port: number) {
        this.socketRemoteServerIP = ip;
        this.socketRemoteServerPort = port;
    }
    //-----------------------------------------------------------------------
    async startRemoteClient() {
        // await this.readConfigFile();//read config.json
        this.socketRemoteClient = null;
        this.configureClient();// connect to modbus server
    }

    //----------------------------------------------------------------------------------
    readConfigFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.socketRemoteServerIP = configJson.socketRemoteServerIP;
            this.socketRemoteServerPort = configJson.socketRemoteServerPort;
            resolve(true);
        });
    }

    //-----------------------------------------------------------------------------------
    configureClient() // connect to remote server
    {

        this.socketRemoteClient = Net.connect(this.socketRemoteServerPort, this.socketRemoteServerIP, () => {
            //console.log(`modbusClient connected to: ${this.socketRemoteClient.address} :  ${this.socketRemoteClient.localPort}`);
            console.log("Remote server connected. IP:" + this.socketRemoteServerIP + ',port:this.socketRemoteServerPort');

            this.flagServerStatus = true;


            // received server cmd data \
            this.socketRemoteClient.on('data', (data) => {
                if(this.flagTest==true)
                {
                    this.timeEnd=this.getTimestamp();
                    this.deltaTime=this.timeStart-this.timeEnd;
                    this.flagTest=false;
                    console.log("latency= "+this.deltaTime+" ms");
                }

            });

            //this.socketRemoteClient.setEncoding('utf8');

            this.socketRemoteClient.on('close', () => {
                console.log('remote server disconnected!')
                this.flagServerStatus = false;

            })

        });
        this.socketRemoteClient.on('error', (err) => {
            this.flagServerStatus = false;
            console.log('remote server error:')
            console.log(err)
        })
    }

    //-----------------------------------------------------------------------------------
    isRemoteServerHolding(): boolean {
        return this.flagServerStatus;
    }
    //-----------------------------------------------------------------------------------
    sendMsg2Server(msg: string)//sent cmd data to server
    {
        //console.log("sent msg")
        this.flagTest=true;

        this.timeStart=this.getTimestamp();
        this.socketRemoteClient.write(msg);
    }

    getTimestamp():number
    {
        const hrTime=process.hrtime();
        return hrTime[0]*1000+hrTime[1]/1000000; 
    }

}
