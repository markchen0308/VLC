import * as PS from 'process';


PS.on('message',(msg)=>{

    console.log('RS485 get data from '+msg);
})

PS.send('RS485');
