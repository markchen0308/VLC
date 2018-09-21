"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CP = require("child_process");
const datatype_1 = require("./datatype");
class PROCESSES {
    constructor() {
        console.log('start process');
        this.processesControl(); //start all process
    }
    /**
     * start child process central
     */
    startChildCentral() {
        return new Promise((resolve, reject) => {
            this.cpCentral = CP.fork(datatype_1.cpControl.dirPathName + datatype_1.cpControl.fileName_Central); //fork a sub process//fork a sub process
            //msg from child process
            this.cpCentral.on('message', (msg) => {
                if (datatype_1.cpControl.cmdCPCompare(msg, datatype_1.cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                 {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            });
            this.cpCentral.send(datatype_1.cpControl.cmdStartCP()); //send stat child process
        });
    }
    /**
     * start child process location
     */
    startChildProcessLocation() {
        return new Promise((resolve, reject) => {
            this.cpLocation = CP.fork(datatype_1.cpControl.dirPathName + datatype_1.cpControl.fileName_Location); //fork a sub process
            //msg from child process
            this.cpLocation.on('message', (msg) => {
                if (datatype_1.cpControl.cmdCPCompare(msg, datatype_1.cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                 {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            });
            this.cpLocation.send(datatype_1.cpControl.cmdStartCP()); //send stat child process
        });
    }
    /**
     * start child process webserver
     */
    startChildProcessWebserver() {
        return new Promise((resolve, reject) => {
            this.cpWebserver = CP.fork(datatype_1.cpControl.dirPathName + datatype_1.cpControl.fileName_Webserver); //fork a sub process
            //msg from child process
            this.cpWebserver.on('message', (msg) => {
                if (datatype_1.cpControl.cmdCPCompare(msg, datatype_1.cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                 {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            });
            this.cpWebserver.send(datatype_1.cpControl.cmdStartCP()); //send stat child process
        });
    }
    /**
     * start child process RS485
     */
    startChildProcessRS485() {
        return new Promise((resolve, reject) => {
            this.cpRS485 = CP.fork(datatype_1.cpControl.dirPathName + datatype_1.cpControl.fileName_RS485); //fork a sub process
            //msg from child process
            this.cpRS485.on('message', (msg) => {
                if (datatype_1.cpControl.cmdCPCompare(msg, datatype_1.cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                 {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            });
            this.cpRS485.send(datatype_1.cpControl.cmdStartCP()); //send stat child process
        });
    }
    /**
     * sequences of starting process
     */
    async processesControl() {
        let rx;
        rx = await this.startChildCentral();
        if (rx) {
            rx = await this.startChildProcessLocation();
            if (rx) {
                rx = await this.startChildProcessWebserver();
                rx = await this.startChildProcessRS485();
            }
            else {
                console.log('startChildProcessLocation fail.');
            }
        }
        else {
            console.log('startChildCentral fail.');
            console.log('stop system!');
        }
    }
}
exports.PROCESSES = PROCESSES;
//# sourceMappingURL=processes.js.map