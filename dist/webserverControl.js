"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Exp = require("express");
class WebserverControl {
    constructor(portWebServer = 8000) {
        this.webServerVersion = 'V1.0.0';
        this.app = Exp();
        this.methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
        this.router = Exp.Router();
        this.portWebServer = portWebServer;
    }
    configSetting() {
        this.app.use(Exp.static(__dirname + '/public')); // set the static files location /public/img will be /img for users
        this.app.listen(this.portWebServer, () => {
            console.log('Web Server started!');
        });
        this.router.get('/', (req, res) => {
            // Reply root with a Web server version
            res.send('This is VLC web server. (version:' + this.webServerVersion + ')');
        });
    }
}
exports.WebserverControl = WebserverControl;
//# sourceMappingURL=webserverControl.js.map