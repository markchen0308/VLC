//import { Router, Request, Response } from 'express';
import * as core from "express-serve-static-core";
import * as Exp from 'express';
import * as BodyParser from 'body-parser';
import * as MethodOverride from 'method-override';


export class WebserverControl {
    webServerVersion: string = 'V1.0.0';
    app: core.Express = Exp();
    methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
    router: core.Router = Exp.Router();


    portWebServer: number;

    constructor(portWebServer = 8000) {
        this.portWebServer = portWebServer;
    }

    configSetting() {
        this.app.use(Exp.static(__dirname + '/public'));// set the static files location /public/img will be /img for users
        this.app.listen(this.portWebServer, () => {
            console.log('Web Server started!');
        });



        this.router.get('/', (req: Exp.Request, res: Exp.Response) => {
            // Reply root with a Web server version
            res.send('This is VLC web server. (version:' + this.webServerVersion + ')');
        });
    }





    //router.get('/:name', (req: Request, res: Response) => { });
}