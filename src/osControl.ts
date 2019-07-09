import * as OS from 'os';


export class OSControl {
    platform: string;
    hostname: string;
    architecture: string;
    version: string;
    totalMem: number;
    freeMem: number
    cpuInfo: any[];
    cpuCore:number;
    networkInfo:{};

    constructor() {
        this.platform = OS.platform();
        this.hostname = OS.hostname();
        this.architecture = OS.arch();
        this.version = OS.release();
        this.totalMem = OS.totalmem() / (1024 * 1024);
        this.freeMem = OS.freemem() / (1024 * 1024);
        this.cpuInfo = OS.cpus();
        this.cpuCore=0;
        this.cpuInfo.forEach(element => {
            this.cpuCore++;
        });
        
        this.networkInfo=OS.networkInterfaces();

        this.showSystemInfo();


    }

    public showSystemInfo() {
       
        console.log('platform:' + this.platform);
        console.log('Host name:' + this.hostname);
        console.log('cpu arch:' + this.architecture);
        console.log('kernel version:' + this.version);
        console.log('totoal memory:' + this.totalMem + 'Mb');
        console.log('free memory:' + this.freeMem + 'Mb');
        console.log( 'cpu brand:'+this.cpuInfo[0].model+'; cpu core number:'+this.cpuCore);
        console.log('network infomation:');
        console.log(this.networkInfo);
    }
}