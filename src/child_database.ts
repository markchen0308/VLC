import * as PS from 'process';

PS.on('message',(msg)=>{

    console.log('child database get data from parent:'+msg);
})

PS.send('yes');
