"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PG = require("pg");
const PgFormat = require("pg-format");
const fs = require("fs");
let configfilePath = './config.json';
let isDelTable = true;
let isDelAllTable = false;
let GWTABLE_PREFIX = 'GW_HISTORY';
class PgControl {
    constructor() {
        this.InitDB();
        this.checkIfCrossDate();
    }
    //--------------------------------------------------------------------------------------------
    checkIfCrossDate() {
        let temp;
        setInterval(() => {
            temp = this.getTodayTableName();
            if (temp != this.tableName) {
                this.tableName = temp;
            }
        }, 60000); //check date per 60 seconds
    }
    //-------------------------------------------------------------------------------------------
    async InitDB() {
        this.tableName = this.getTodayTableName(); //get todate table name
        let res = await this.connectDB(); //create entry and connect DB
        if (res == true) {
            if (isDelAllTable) {
                await this.deleteAllTable();
            }
            else if (isDelTable) {
                await this.deleteTable(this.tableName); //delete table
            }
            await this.createTable(this.tableName); //create table if the table is not exist
        }
    }
    //-------------------------------------------------------------------
    connectDB() {
        return new Promise((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8'); //read config.json file
            let configJson = JSON.parse(configJsonFile); //parse coonfig.json file
            this.dbConfig = {
                user: configJson.dbUser,
                host: configJson.dbHost,
                database: configJson.dbName,
                password: configJson.dbPassword,
                port: configJson.dbPort
            };
            this.pgClient = new PG.Client(this.dbConfig);
            this.pgClient.connect().then(() => {
                console.log('postreSQL is connected ');
                resolve(true);
            })
                .catch((err) => {
                console.log('postreSQL connected unsucessfully');
                console.log("Error Message：" + err);
                reject(false);
            });
        });
    }
    //---------------------------------------------------------------------------------
    deleteTable(name) {
        let queryCmd = 'DROP TABLE IF EXISTS ' + name + ' ;';
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                resolve(true);
            })
                .catch((reason) => {
                resolve(false);
            });
        });
    }
    //--------------------------------------------------------------------------------
    async deleteAllTable() {
        let collections = [];
        //get all table name
        await this.queryTables().then((res) => {
            res.rows.forEach((item) => {
                collections.push(item.tablename); //save table name
            });
        });
        //delete all table
        for (let i = 0; i < collections.length; i++) {
            await this.deleteTable(collections[i]);
        }
        return new Promise((resolve, reject) => {
            if (collections.length > 0) {
                resolve(true);
            }
            else {
                reject(false);
            }
        });
    }
    //-----------------------------------------------------------------
    createTable(tableName) {
        let queryCmd = 'CREATE TABLE IF NOT EXISTS ' + tableName +
            '(id SERIAL PRIMARY KEY,' +
            'dbsavetime TIMESTAMP,' +
            'gwseq INTEGER,' +
            'gatewaytimming TIMESTAMP,' +
            'gatewaydata JSON);';
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                resolve(true);
            })
                .catch((reason) => {
                resolve(false);
            });
        });
    }
    //------------------------------------------------------------------------
    dbInsert(tableName, data) {
        let now = new Date();
        let queryCmd = 'INSERT INTO ' + tableName + '(dbsavetime,gwseq,gatewaytimming,gatewaydata) VALUES($1,$2,$3,$4)';
        let value = [now, data.GatewaySeq, data.Datetime, data];
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd, value)
                .then((value) => {
                resolve(true);
            })
                .catch((reason) => {
                resolve(false);
            });
        });
    }
    //---------    //------------------------------------------------------------------------
    dbInsertPacth(tableName, data) {
        let now = new Date();
        let values = [];
        data.forEach(item => {
            let subValue = [now, item.GatewaySeq, item.Datetime, item];
            values.push(subValue);
        });
        let queryCmd = 'INSERT INTO ' + tableName + '(dbsavetime,gwseq,gatewaytimming,gatewaydata) VALUES %L returning id';
        let query1 = PgFormat(queryCmd, values);
        return new Promise((resolve, reject) => {
            this.pgClient.query(query1)
                .then((value) => {
                resolve(true);
            })
                .catch((reason) => {
                resolve(false);
            });
        });
    }
    //-------------------------------------------------------------------
    //-----------------------------------------------------------------------------------
    queryAll(tableName) {
        let queryCmd = 'SELECT dbsavetime,gwseq,gatewaytimming,gatewaydata ' +
            'FROM ' + tableName + ' ' +
            'ORDER BY dbsavetime ASC ';
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                resolve(value);
            })
                .catch((reason) => {
                reject(reason);
            });
        });
    }
    //------------------------------------------------------------------------------------
    querylatest(tableName) {
        let queryCmd = 'SELECT dbsavetime,gwseq,gatewaytimming,gatewaydata ' +
            'FROM ' + tableName + ' ' +
            'ORDER BY dbsavetime DESC ' +
            'LIMIT 1';
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                resolve(value);
            })
                .catch((reason) => {
                resolve(reason);
            });
        });
    }
    //------------------------------------------------------------------------------------
    queryAfterSeqID(tableName, seqID) {
        let queryCmd = 'SELECT dbsavetime,gwseq,gatewaytimming,gatewaydata ' +
            'FROM ' + tableName + ' ' +
            'WHERE gwseq >= ' + seqID.toString() + ' ' +
            'ORDER BY dbsavetime DESC ';
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                resolve(value);
            })
                .catch((reason) => {
                resolve(reason);
            });
        });
    }
    //------------------------------------------------------------------------------
    //query all table in DB
    queryTables() {
        let queryCmd = 'SELECT * ' +
            'FROM pg_catalog.pg_tables ' +
            'WHERE schemaname != \'pg_catalog\' ' +
            'AND schemaname = \'public\'';
        return new Promise((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                resolve(value);
            })
                .catch((reason) => {
                resolve(reason);
            });
        });
    }
    //------------------------------------------------------------------
    getTableName(prefix_name, datetime) {
        let yyyy = datetime.getFullYear();
        let MM = datetime.getMonth() + 1;
        let DD = datetime.getDate();
        let tableName = prefix_name + "_" + yyyy.toString() + '_' +
            ((MM > 9) ? '' : '0') + MM.toString() + '_' +
            ((DD > 9) ? '' : '0') + DD.toString();
        return tableName;
    }
    //------------------------------------------------------------------
    getToday() {
        return new Date();
    }
    //------------------------------------------------------------------
    getYesterday() {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }
    //------------------------------------------------------------------
    getSomeDate(yyyy, MM, dd) {
        return new Date(yyyy, MM - 1, dd);
    }
    //------------------------------------------------------------------
    getTodayTableName() {
        return this.getTableName(GWTABLE_PREFIX, this.getToday());
    }
    //------------------------------------------------------------------------
    getYesterdayTableName() {
        return this.getTableName(GWTABLE_PREFIX, this.getYesterday());
    }
    //------------------------------------------------------------------------
    getSomeDateTableName(yyyy, MM, dd) {
        return this.getTableName(GWTABLE_PREFIX, this.getSomeDate(yyyy, MM, dd));
    }
}
exports.PgControl = PgControl;
//# sourceMappingURL=pgControl.js.map