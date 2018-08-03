import * as PS from 'process';


PS.on('message',(msg)=>{

    console.log('webserver get data from '+msg);
})

PS.send('webserver');
