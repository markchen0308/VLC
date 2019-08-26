
import * as fs from 'fs';
import * as request from 'request';
import { config } from 'pg-format';
let configfilePath = './config.json';


export class MobolinkAgent {

    mobolinkDir: string;
    mobolinkFileDevInfo: string;
    mobolinkSchemaUserName: string;
    mobolinkSchemaPw: string;
    devId: string;
    serverUrl: string;
    devUsername: string;
    devPassword: string;
    mobolinkSchemaId: string;

    constructor() { }

    //-------------------------------------------------------------------------------------------------------------------------------------------------------------
    searchWord(context: string, splitSymLine: string, keyword: string, splitSymColumn: string, keywordColumnIndex: number): string {
        let str: string = "";
        let dataArray = context.split(splitSymLine);
        let lastIndex: number = -1; // let say, we have not found the keyword
        for (let index = 0; index < dataArray.length; index++) {
            if (dataArray[index].includes(keyword)) { // check if a line contains the 'user1' keyword
                lastIndex = index; // found a line includes a 'user1' keyword
                break;
            }
        }

        if (lastIndex != -1) {
            let temp = dataArray[lastIndex].split(splitSymColumn);

            str = temp[keywordColumnIndex];
            str = str.split('\"').join("")
        }
        return str;
    }
    //------------------------------------------------------------------------------------------------------------------------------------------------------
    readConfigFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file
            this.mobolinkDir = configJson.mobolinkDir;
            this.mobolinkFileDevInfo = configJson.mobolinkFileDevInfo;
            this.mobolinkSchemaUserName = configJson.mobolinkSchemaUserName;
            this.mobolinkSchemaPw = configJson.mobolinkSchemaPw;
            this.mobolinkSchemaId = configJson.mobolinkSchemaId;



            let path: string = this.mobolinkDir + this.mobolinkFileDevInfo
            let context: string = fs.readFileSync(path, 'utf8');//read config.json file

            let splitSymLine: string = '\n';
            let splitSymColumn: string = ' ';
            let keywordColumnIndex: number = 3;

            let keyword: string = 'DevUsername';
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

        let rx: object;


        let jsonData: object = {
            "test01": "tes01",
            "test02": 30,
            "test03": 25
        }
        rx = await this.sendProbeData(jsonData);
        if (rx != null) {
            console.log(rx)
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
    getAllSchema(): Promise<object> {
        let urlApi: string = this.serverUrl + '/rest/dynaDataSchemas';
        let auth: string = "Basic " + Buffer.from(this.mobolinkSchemaUserName + ":" + this.mobolinkSchemaPw).toString("base64");

        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            }
        }
        return new Promise<object>((resolve, reject) => {
            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let info = JSON.parse(body);

                    let schemaTables = info['_embedded']['dynaDataSchemas'];
                    resolve(schemaTables);
                }
                else {
                    reject(null);
                }
            })
        })
    }
    //---------------------------------------------------------------------------------------------------------------------------------------------
    getOneSchema(schemaID: string): Promise<object> {
        let urlApi: string = this.serverUrl + '/rest/dynaDataSchemas/' + schemaID;
        let auth: string = "Basic " + Buffer.from(this.mobolinkSchemaUserName + ":" + this.mobolinkSchemaPw).toString("base64");

        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            }
        }
        return new Promise<object>((resolve, reject) => {
            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let info = JSON.parse(body);
                    resolve(info);
                }
                else {
                    reject(null);
                }
            })
        })
    }
    //---------------------------------------------------------------------------------------------------------------------------------------------
    createSchema(jsonSchema: object): Promise<object> {
        let urlApi: string = this.serverUrl + '/rest/dynaDataSchemas';
        let auth: string = "Basic " + Buffer.from(this.mobolinkSchemaUserName + ":" + this.mobolinkSchemaPw).toString("base64");


        //"name": "By gateway " + this.devId,

        let jsonObj: object = {
            "name": "By_Gateway_" + this.devId + "_" + new Date().getTime(),
            "category": "PROBE_DATA",
            "properties": jsonSchema
        }

        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            },
            body: jsonObj,
            json: true
        }

        return new Promise<object>((resolve, reject) => {
            request.post(options, (error, response, body) => {
                console.log(response.statusCode)
                if (!error && response.statusCode == 201) {
                    resolve(body);
                }
                else {
                    reject(null);
                }
            })
        })
    }
    //------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------
    sendProbeData(jsonData: object): Promise<object> {
        let urlApi: string = this.serverUrl + '/rest/probeData';
        let auth: string = "Basic " + Buffer.from(this.devUsername + ":" + this.devPassword).toString("base64");



        let probeMetaData: object = {
            "schema": this.mobolinkSchemaId,
            "deviceId": this.devId
        }



        let jsonObj: object = {
            "meta": probeMetaData,
            "dyna": jsonData
        }

        let options = {
            url: urlApi,
            headers: {
                "Authorization": auth,
                "Content-Type": "Application/hal+json"
            },
            body: jsonObj,
            json: true
        }

        return new Promise<object>((resolve, reject) => {
            request.post(options, (error, response, body) => {
                //console.log(response.statusCode)
                if (!error && response.statusCode == 201) {
                    resolve(body);
                }
                else {
                    reject(null);
                }
            })
        })
    }
    //------------------------------------------------------------------------------------------------------------------------

}




let mobo = new MobolinkAgent();
mobo.readConfigFile();
mobo.testFunction();


