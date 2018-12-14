
import {PROCESSES} from './processes';
import { OSControl } from './osControl';
import {ModbusRTU} from './modbusDriver'
//let oscntl:OSControl=new OSControl();

//let processContol:PROCESSES=new PROCESSES();//start processes

let masterRs485:ModbusRTU=new ModbusRTU();