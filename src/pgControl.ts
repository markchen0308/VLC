import * as PG from 'pg';
import * as PgFormat from 'pg-format';
import * as fs from 'fs';
import { iGwInf } from './dataTypeModbus';
let configfilePath = './config.json';

let isDelTable: boolean = true;
let isDelAllTable: boolean = false;
let GWTABLE_PREFIX: string = 'GW_HISTORY';

export class PgControl {

    dbConfig: PG.ClientConfig;
    pgClient: PG.Client;//database entry


    dropTableCmd: string;
    createTableCmd: string;

    public tableName: string;


    constructor() {
        this.InitDB();
        this.checkIfCrossDate();
    }
    //--------------------------------------------------------------------------------------------
    checkIfCrossDate() {
        let temp: string;
        setInterval(() => {
            temp = this.getTodayTableName();
            if (temp != this.tableName) {
                this.tableName = temp;
            }
        }, 60000)//check date per 60 seconds
    }
    //-------------------------------------------------------------------------------------------
    async InitDB() {
        this.tableName = this.getTodayTableName();//get todate table name
        let res = await this.connectDB();//create entry and connect DB
        if (res == true) {

            if (isDelAllTable) {
                await this.deleteAllTable();
            }
            else if (isDelTable) {

                await this.deleteTable(this.tableName);//delete table
            }
            await this.createTable(this.tableName);//create table if the table is not exist
        }
    }
    //-------------------------------------------------------------------
    connectDB(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let configJsonFile = fs.readFileSync(configfilePath, 'utf8');//read config.json file
            let configJson = JSON.parse(configJsonFile);//parse coonfig.json file

            this.dbConfig = {
                user: configJson.dbUser,
                host: configJson.dbHost,
                database: configJson.dbName,
                password: configJson.dbPassword,
                port: configJson.dbPort
            }

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
    deleteTable(name: string): Promise<boolean> {
        let queryCmd: string = 'DROP TABLE IF EXISTS ' + name + ' ;';
        return new Promise<boolean>((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                    resolve(true);
                })
                .catch((reason) => {
                    resolve(false);
                })
        });
    }
    //--------------------------------------------------------------------------------
    async deleteAllTable(): Promise<boolean> {
        let collections: string[] = [];
        //get all table name
        await this.queryTables().then((res) => {
            res.rows.forEach((item) => {
                collections.push(item.tablename);//save table name
            });
        });

        //delete all table
        for (let i: number = 0; i < collections.length; i++) {
            await this.deleteTable(collections[i]);
        }

        return new Promise<boolean>((resolve, reject) => {
            if (collections.length > 0) {
                resolve(true);
            }
            else {
                reject(false);
            }
        });
    }
    //-----------------------------------------------------------------
    createTable(tableName: string): Promise<boolean> {
        let queryCmd: string =
            'CREATE TABLE IF NOT EXISTS ' + tableName +
            '(id SERIAL PRIMARY KEY,' +
            'dbsavetime TIMESTAMP,' +
            'gwseq INTEGER,' + 
            'gatewaytimming TIMESTAMP,' +
            'gatewaydata JSON);';

        return new Promise<boolean>((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                    resolve(true);
                })
                .catch((reason) => {
                    resolve(false);
                })
        });
    }
    //------------------------------------------------------------------------
    dbInsert(tableName: string, data: iGwInf): Promise<boolean> {
        let now = new Date();
        let queryCmd: string =
            'INSERT INTO ' + tableName + '(dbsavetime,gwseq,gatewaytimming,gatewaydata) VALUES($1,$2,$3,$4)'
        let value: any[] = [now,data.GatewaySeq, data.Datetime, data];
        return new Promise<boolean>((resolve, reject) => {
            this.pgClient.query(queryCmd, value)
                .then((value) => {
                    resolve(true);
                })
                .catch((reason) => {
                    resolve(false);
                })
        });
    }
    //---------    //------------------------------------------------------------------------
    dbInsertPacth(tableName: string, data: iGwInf[]): Promise<boolean> {
        let now = new Date();
        let values: any[] =[];
        data.forEach(item => {
            let subValue:any[]= [now, item.GatewaySeq, item.Datetime, item];
            values.push(subValue);
        });
        
        
        let queryCmd: string =
            'INSERT INTO ' + tableName + '(dbsavetime,gwseq,gatewaytimming,gatewaydata) VALUES %L returning id'
    
        let query1 = PgFormat(queryCmd, values);
           
        return new Promise<boolean>((resolve, reject) => {
            this.pgClient.query(query1)
                .then((value) => {
                    resolve(true);
                })
                .catch((reason) => {
                    resolve(false);
                })
        });
    }
    //-------------------------------------------------------------------

    //-----------------------------------------------------------------------------------
    queryAll(tableName: string): Promise<PG.QueryResult> {
        let queryCmd: string =
            'SELECT dbsavetime,gwseq,gatewaytimming,gatewaydata ' +
            'FROM ' + tableName + ' ' +
            'ORDER BY dbsavetime ASC ';

        return new Promise<PG.QueryResult>((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                    resolve(value);
                })
                .catch((reason) => {
                    reject(reason);
                })
        });
    }
    //------------------------------------------------------------------------------------
    querylatest(tableName: string): Promise<PG.QueryResult> {
        let queryCmd: string =
            'SELECT dbsavetime,gwseq,gatewaytimming,gatewaydata ' +
            'FROM ' + tableName + ' ' +
            'ORDER BY dbsavetime DESC ' +
            'LIMIT 1';

        return new Promise<PG.QueryResult>((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                    resolve(value);
                })
                .catch((reason) => {
                    resolve(reason);
                })
        });
    }

    //------------------------------------------------------------------------------------
    queryAfterSeqID(tableName: string,seqID:number): Promise<PG.QueryResult> {
            let queryCmd: string =
                'SELECT dbsavetime,gwseq,gatewaytimming,gatewaydata ' +
                'FROM ' + tableName + ' ' +
                'WHERE gwseq >= '+seqID.toString()+' '+
                'ORDER BY dbsavetime DESC ' 
    
            return new Promise<PG.QueryResult>((resolve, reject) => {
                this.pgClient.query(queryCmd)
                    .then((value) => {
                        resolve(value);
                    })
                    .catch((reason) => {
                        resolve(reason);
                    })
            });
        }
    //------------------------------------------------------------------------------
    //query all table in DB
    queryTables(): Promise<PG.QueryResult> {
        let queryCmd: string =
            'SELECT * ' +
            'FROM pg_catalog.pg_tables ' +
            'WHERE schemaname != \'pg_catalog\' ' +
            'AND schemaname = \'public\'';

        return new Promise<PG.QueryResult>((resolve, reject) => {
            this.pgClient.query(queryCmd)
                .then((value) => {
                    resolve(value);
                })
                .catch((reason) => {
                    resolve(reason);
                })
        });
    }
    //------------------------------------------------------------------
    getTableName(prefix_name: string, datetime: Date): string {
        let yyyy: number = datetime.getFullYear();
        let MM: number = datetime.getMonth() + 1;
        let DD: number = datetime.getDate();
        let tableName = prefix_name + "_" + yyyy.toString() + '_' +
            ((MM > 9) ? '' : '0') + MM.toString() + '_' +
            ((DD > 9) ? '' : '0') + DD.toString();
        return tableName;
    }
    //------------------------------------------------------------------
    getToday(): Date {
        return new Date();
    }
    //------------------------------------------------------------------
    getYesterday(): Date {
        let yesterday: Date = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }
    //------------------------------------------------------------------
    getSomeDate(yyyy: number, MM: number, dd: number):Date{
        return new Date(yyyy, MM - 1, dd);
    }
    //------------------------------------------------------------------
    getTodayTableName(): string {
        return this.getTableName(GWTABLE_PREFIX, this.getToday());
    }
    //------------------------------------------------------------------------
    getYesterdayTableName(): string {
        return this.getTableName(GWTABLE_PREFIX, this.getYesterday());
    }
    //------------------------------------------------------------------------
    getSomeDateTableName(yyyy: number, MM: number, dd: number): string {
        return this.getTableName(GWTABLE_PREFIX, this. getSomeDate(yyyy,MM,dd));
    }


    
}



