import * as PS from 'process';
import * as CP from 'child_process';

import { InterfaceCP, cpControl } from './datatype'


export class PROCESSES {

    cpCentral: CP.ChildProcess;
    cpRS485: CP.ChildProcess;
    cpWebserver: CP.ChildProcess;
    cpLocation: CP.ChildProcess;

    constructor() {
        console.log('start process');
        this.processesControl();//start all process
    }

    /**
     * start child process central
     */
    startChildCentral(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.cpCentral = CP.fork(cpControl.dirPathName + cpControl.fileName_Central);//fork a sub process//fork a sub process
            //msg from child process
            this.cpCentral.on('message', (msg: InterfaceCP) => {

                if (cpControl.cmdCPCompare(msg, cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            })
            this.cpCentral.send(cpControl.cmdStartCP());//send stat child process
        })
    }

    /**
     * start child process location
     */
    startChildProcessLocation(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.cpLocation = CP.fork(cpControl.dirPathName + cpControl.fileName_Location);//fork a sub process
            //msg from child process
            this.cpLocation.on('message', (msg: InterfaceCP) => {
                if (cpControl.cmdCPCompare(msg, cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            })
            this.cpLocation.send(cpControl.cmdStartCP());//send stat child process
        })
    }

    /**
     * start child process webserver
     */
    startChildProcessWebserver(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.cpWebserver = CP.fork(cpControl.dirPathName + cpControl.fileName_Webserver);//fork a sub process
            //msg from child process
            this.cpWebserver.on('message', (msg: InterfaceCP) => {
                if (cpControl.cmdCPCompare(msg, cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            })
            this.cpWebserver.send(cpControl.cmdStartCP());//send stat child process
        })
    }

    /**
     * start child process RS485
     */
    startChildProcessRS485(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.cpRS485 = CP.fork(cpControl.dirPathName + cpControl.fileName_RS485);//fork a sub process
            //msg from child process
            this.cpRS485.on('message', (msg: InterfaceCP) => {
                if (cpControl.cmdCPCompare(msg, cpControl.cmdStartCPReplyOK())) //compare reply of cmd
                {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            })
            this.cpRS485.send(cpControl.cmdStartCP());//send stat child process
        })
    }



    /**
     * sequences of starting process
     */
    async  processesControl() {
        let rx: boolean;
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