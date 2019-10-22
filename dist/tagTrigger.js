"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const CP = require("child_process");
const SP = require("serialport");
//let SerialPort = SP.;
class TagTrigger {
    //--------------------------------------------------------------------
    constructor() {
        this.exec = util.promisify(CP.exec);
        this.tagDeviceName = 'ttyUSB1';
        this.devicePath = '/dev/' + this.tagDeviceName;
        this.baudrate = 115200; //baudrate =3m;
        this.isDeviceOk = false;
        this.process();
        //this.test();
    }
    //--------------------------------------------------------------------
    test() {
        setInterval(() => {
            this.writeUSBTriggle();
        }, 1000);
    }
    //------------------------------------------------------------------------
    initUSBTrigger() {
        this.serialPort = new SP(this.devicePath, {
            baudRate: this.baudrate,
        });
        //this.serialParser = new RL();
        //this.serialPort.pipe(this.serialParser);
        //   this.serialPort
        //   this.serialParser.on('data', line => console.log(`> ${line}`))
        this.serialPort.on('open', () => {
            this.isDeviceOk = true;
        });
        //打开错误将会发出一个错误事件
        this.serialPort.on('error', (err) => {
            console.log('tag trigger error');
            this.isDeviceOk = false;
        });
        this.serialPort.on('data', (data) => {
            console.log('get Data: ' + data);
        });
    }
    //-----------------------------------------------------------------------
    writeUSBTriggle() {
        this.serialPort.write('1');
    }
    //-------------------------------------------------------------------------
    async process() {
        let rx = await this.checkUSBDevice();
        if (rx) {
            this.delay(5000);
            this.initUSBTrigger();
            console.log('uart triggler ' + this.tagDeviceName + ' is exist!');
        }
        else {
            this.isDeviceOk = false;
            console.log('uart triggler ' + this.tagDeviceName + ' is not exist!');
        }
    }
    //----------------------------------------------------------------
    async checkUSBDevice() {
        let rx = await this.exec('ls /dev/ | grep ' + this.tagDeviceName);
        if (rx.stdout.includes(this.tagDeviceName)) {
            this.isDeviceOk = true;
            rx = await this.exec('chmod +x ' + this.devicePath); //set  executable
        }
        else {
            this.isDeviceOk = false;
        }
        return new Promise((resolve, reject) => {
            if (this.isDeviceOk) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }
    //------------------------------------------------------------------------
    delay(msec) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(true); }, msec);
        });
    }
}
exports.TagTrigger = TagTrigger;
