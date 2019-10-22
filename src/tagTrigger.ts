import * as util from 'util';
import * as CP from 'child_process';
import * as SP from 'serialport';
import * as RL from '@serialport/parser-readline';


//let SerialPort = SP.;

export class TagTrigger {
    private exec = util.promisify(CP.exec);
    public tagDeviceName: string = 'ttyUSB1';
    public devicePath: string = '/dev/' + this.tagDeviceName;
    public baudrate: number = 115200;//baudrate =3m;
    public serialPort: SP;
    public serialParser: RL;


    isDeviceOk: boolean = false;

    //--------------------------------------------------------------------
    constructor() {
        this.process();
        //this.test();
 
    }
    //--------------------------------------------------------------------
    test()
    {
        setInterval(
            ()=>{
              this.writeUSBTriggle();
            },
            1000  
          );
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
        this.serialPort.on('error',  (err)=> {
            console.log('tag trigger error');
            this.isDeviceOk = false;
        });

        this.serialPort.on('data',(data)=>{
            console.log('get Data: '+data);
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
    async checkUSBDevice(): Promise<boolean> {


        let rx = await this.exec('ls /dev/ | grep ' + this.tagDeviceName);
        if (rx.stdout.includes(this.tagDeviceName)) {
            this.isDeviceOk = true;
            rx = await this.exec('chmod +x ' + this.devicePath);//set  executable
        }
        else {
            this.isDeviceOk = false;
        }

        return new Promise<boolean>((resolve, reject) => {
            if (this.isDeviceOk) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }

    //------------------------------------------------------------------------
    delay(msec: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => { resolve(true) }, msec);
        });
    }
    //-----------------------------------------------------------------------------------------------   
}




