"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const request = require("request");
let configfilePath = './config.json';
class MobolinkAgent {
    constructor() { }
    //-------------------------------------------------------------------------------------------------------------------------------------------------------------
    searchWord(context, splitSymLine, keyword, splitSymColumn, keywordColumnIndex) {
        let str = "";
        let dataArray = context.split(splitSymLine);
        let lastIndex = -1; // let say, we have not found the keyword
        for (let index = 0; index < dataArray.length; index++) {
            if (dataArray[index].includes(keyword)) { // check if a line contains the 'user1' keyword
                lastIndex = index; // found a line includes a 'user1' keyword
                break;
            }
        }
        if (lastIndex != -1) {
            let temp = dataArray[lastIndex].split(splitSymColumn);
            str = temp[keywordColumnIndex];
            str = str.split('\"').join("");
        }
        return str;
    }
    //------------------------------------------------------------------------------------------------------------------------------------------------------
    readConfigFile() {
        return new Promise((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8'); //read config.json file
            let configJson = JSON.parse(configJsonFile); //parse coonfig.json file
            this.mobolinkDir = configJson.mobolinkDir;
            this.mobolinkFileDevInfo = configJson.mobolinkFileDevInfo;
            this.mobolinkSchemaUserName = configJson.mobolinkSchemaUserName;
            this.mobolinkSchemaPw = configJson.mobolinkSchemaPw;
            this.mobolinkSchemaId = configJson.mobolinkSchemaId;
            let path = this.mobolinkDir + this.mobolinkFileDevInfo;
            let context = fs.readFileSync(path, 'utf8'); //read config.json file
            let splitSymLine = '\n';
            let splitSymColumn = ' ';
            let keywordColumnIndex = 3;
            let keyword = 'DevUsername';
            this.devUsername = this.searchWord(context, splitSymLine, keyword, splitSymColumn, keywordColumnIndex);
            keyword = 'DevPassword';
            this.devPassword = this.searchWord(context, splitSymLine, keyword, splitSymColumn, keywordColumnIndex);
            keyword = 'ServerUrl';
            this.serverUrl = this.searchWord(context, splitSymLine, keyword, splitSymColumn, keywordColumnIndex);
            keyword = 'DevId';
            this.devId = this.searchWord(context, splitSymLine, keyword, splitSymColumn, keywordColumnIndex);
            console.log("mobolink DevId:" + this.devId);
            console.log("mobolink DevUsername:" + this.devUsername);
            console.log("mobolink DevPassword:" + this.devPassword);
            console.log("mobolink ServerUrl:" + this.serverUrl);
            resolve(true);
        });
    }
    //-----------------------------------------------------------------------------------------------------------------------------------------------------------------
    async testFunction() {
        let rx;
        let jsonData = {
            "test01": "tes01",
            "test02": 30,
            "test03": 25
        };
        rx = await this.sendProbeData(jsonData);
        if (rx != null) {
            console.log(rx);
        }
        /*
                let jsonSchema: object = {
                    "test01": { "type": "string" },
                    "test02": { "type": "integer" },
                    "test03": { "type": "number" }
                }
                rx = await this.createSchema(jsonSchema);
                if (rx != null) {
                    console.info(rx['id']);
                }
        
        
                rx = await this.getAllSchema();
                if (rx != null) {
                    console.info(rx);
                }
        
                rx = await this.getOneSchema('5cf75c350ed2d8088ca23c06');
                if (rx != null) {
                    console.info(rx);
                }
        */
    }
    //-----------------------------------------------------------------------------------------------------------------------------------------------------------------
    getAllSchema() {
        let urlApi = this.serverUrl + '/rest/dynaDataSchemas';
        let auth = "Basic " + Buffer.from(this.mobolinkSchemaUserName + ":" + this.mobolinkSchemaPw).toString("base64");
        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            }
        };
        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let info = JSON.parse(body);
                    let schemaTables = info['_embedded']['dynaDataSchemas'];
                    resolve(schemaTables);
                }
                else {
                    reject(null);
                }
            });
        });
    }
    //---------------------------------------------------------------------------------------------------------------------------------------------
    getOneSchema(schemaID) {
        let urlApi = this.serverUrl + '/rest/dynaDataSchemas/' + schemaID;
        let auth = "Basic " + Buffer.from(this.mobolinkSchemaUserName + ":" + this.mobolinkSchemaPw).toString("base64");
        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            }
        };
        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let info = JSON.parse(body);
                    resolve(info);
                }
                else {
                    reject(null);
                }
            });
        });
    }
    //---------------------------------------------------------------------------------------------------------------------------------------------
    createSchema(jsonSchema) {
        let urlApi = this.serverUrl + '/rest/dynaDataSchemas';
        let auth = "Basic " + Buffer.from(this.mobolinkSchemaUserName + ":" + this.mobolinkSchemaPw).toString("base64");
        //"name": "By gateway " + this.devId,
        let jsonObj = {
            "name": "By_Gateway_" + this.devId + "_" + new Date().getTime(),
            "category": "PROBE_DATA",
            "properties": jsonSchema
        };
        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            },
            body: jsonObj,
            json: true
        };
        return new Promise((resolve, reject) => {
            request.post(options, (error, response, body) => {
                console.log(response.statusCode);
                if (!error && response.statusCode == 201) {
                    resolve(body);
                }
                else {
                    reject(null);
                }
            });
        });
    }
    //------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------
    sendProbeData(jsonData) {
        let urlApi = this.serverUrl + '/rest/probeData';
        let auth = "Basic " + Buffer.from(this.devUsername + ":" + this.devPassword).toString("base64");
        let probeMetaData = {
            "schema": this.mobolinkSchemaId,
            "deviceId": this.devId
        };
        let jsonObj = {
            "meta": probeMetaData,
            "dyna": jsonData
        };
        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            },
            body: jsonObj,
            json: true
        };
        return new Promise((resolve, reject) => {
            request.post(options, (error, response, body) => {
                //console.log(response.statusCode)
                if (!error && response.statusCode == 201) {
                    resolve(body);
                }
                else {
                    reject(null);
                }
            });
        });
    }
}
exports.MobolinkAgent = MobolinkAgent;
let mobo = new MobolinkAgent();
mobo.readConfigFile();
mobo.testFunction();
