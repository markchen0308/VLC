
import {PROCESSES} from './processes';
import { OSControl } from './osControl';
import {ModbusRTU} from './modbusDriver'
import {ProModbus} from './protocolModbus'
//let oscntl:OSControl=new OSControl();

//let processContol:PROCESSES=new PROCESSES();//start processes

//let masterRs485:ModbusRTU=new ModbusRTU();

let proModbus:ProModbus=new ProModbus();

let numtest:Uint8Array=Uint8Array.from([0xFF,0xFE]);




function byte2Number2s(hbyte:Uint8Array,lbyte:Uint8Array):number
{
    let i16:Int16Array=new Int16Array(1);
   
    i16[0]=0x10000-0xFFFE;
    let num:number=i16[0];
    return num;
}

console.log(byte2Number2s(numtest,numtest))