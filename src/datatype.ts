export interface InterfaceCP {
    cmdtype: string,
    cmdData: string
}


export interface InterfaceLocation {
    cmdtype: string,
    cmdData: string
}

export interface InterfaceCentral {
    cmdtype: string,
    cmdData: string
}



export class CP_PROTOCOL {
    HOST: string = '127.0.0.1';
    PORT_RS485_Central: number = 10003;//rs485 port
    PORT_Webserver_Central: number = 10004;//webserver port
    PORT_Location_Central:number=10005;//algorithm
    PORT_Location_RS485:number=10006;//algorithm
    
    dirPathName: string = './';
    fileName_RS485: string = 'child_rs485.js';//child process name
    fileName_Central: string = 'child_central.js';//child process name
    fileName_Webserver: string = 'child_webserver.js';//child process name
    fileName_Location: string = 'child_location.js';//child process name



    constructor() {

    }
    
    public cmdCPCompare(msg1:InterfaceCP,msg2:InterfaceCP):boolean
    {
        if((msg1.cmdData==msg2.cmdData)&&(msg1.cmdtype==msg2.cmdtype))
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    public cmdStartCP(): InterfaceCP {
        let cmd: InterfaceCP = {
            cmdData: 'startCP',
            cmdtype: ''
        }
        return cmd;
    }

    public cmdStartCPReplyOK(): InterfaceCP {
        let cmd: InterfaceCP = {
            cmdData: 'startCP',
            cmdtype: 'ok'
        }
        return cmd;
    }

    public cmdStartCPReplyFail(): InterfaceCP {
        let cmd: InterfaceCP = {
            cmdData: 'startCP',
            cmdtype: 'fail'
        }
        return cmd;
    }
}

let cpControl: CP_PROTOCOL = new CP_PROTOCOL();// protocols controller of child process
export {cpControl} ;//export variable