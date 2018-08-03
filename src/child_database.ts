import * as PS from 'process';
import {PgControl} from './pgControl';

let pg=new PgControl();

PS.on('message',(msg)=>{

    console.log('database get data from '+msg);
})

PS.send('database');
