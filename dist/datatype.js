"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CP_PROTOCOL {
    constructor() {
        this.HOST = '127.0.0.1';
        this.PORT_RS485_Central = 10003; //rs485 port
        this.PORT_Webserver_Central = 10004; //webserver port
        this.PORT_Location_Central = 10005; //algorithm
        this.PORT_Location_RS485 = 10006; //algorithm
        this.dirPathName = './';
        this.fileName_RS485 = 'child_rs485.js'; //child process name
        this.fileName_Central = 'child_central.js'; //child process name
        this.fileName_Webserver = 'child_webserver.js'; //child process name
        this.fileName_Location = 'child_location.js'; //child process name
    }
    cmdCPCompare(msg1, msg2) {
        if ((msg1.cmdData == msg2.cmdData) && (msg1.cmdtype == msg2.cmdtype)) {
            return true;
        }
        else {
            return false;
        }
    }
    cmdStartCP() {
        let cmd = {
            cmdData: 'startCP',
            cmdtype: ''
        };
        return cmd;
    }
    cmdStartCPReplyOK() {
        let cmd = {
            cmdData: 'startCP',
            cmdtype: 'ok'
        };
        return cmd;
    }
    cmdStartCPReplyFail() {
        let cmd = {
            cmdData: 'startCP',
            cmdtype: 'fail'
        };
        return cmd;
    }
}
exports.CP_PROTOCOL = CP_PROTOCOL;
let cpControl = new CP_PROTOCOL(); // protocols controller of child process
exports.cpControl = cpControl;
//# sourceMappingURL=datatype.js.map