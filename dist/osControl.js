"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OS = require("os");
class OSControl {
    constructor() {
        this.platform = OS.platform();
        this.hostname = OS.hostname();
        this.architecture = OS.arch();
        this.version = OS.release();
        this.totalMem = OS.totalmem() / (1024 * 1024);
        this.freeMem = OS.freemem() / (1024 * 1024);
        this.cpuInfo = OS.cpus();
        this.cpuCore = 0;
        this.cpuInfo.forEach(element => {
            this.cpuCore++;
        });
        this.networkInfo = OS.networkInterfaces();
        this.showSystemInfo();
    }
    showSystemInfo() {
        console.log('platform:' + this.platform);
        console.log('Host name:' + this.hostname);
        console.log('cpu arch:' + this.architecture);
        console.log('kernel version:' + this.version);
        console.log('totoal memory:' + this.totalMem + 'Mb');
        console.log('free memory:' + this.freeMem + 'Mb');
        console.log('cpu brand:' + this.cpuInfo[0].model + '; cpu core number:' + this.cpuCore);
        console.log('network infomation:');
        console.log(this.networkInfo);
    }
}
exports.OSControl = OSControl;
//# sourceMappingURL=osControl.js.map