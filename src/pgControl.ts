import * as PG from 'pg'
import * as fs from 'fs';
import { iGateway } from './dataTypeModbus';
let configfilePath = './config.json';
let isDelTable: boolean = false;
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
    dbInsert(tableName: string, data: iGateway): Promise<boolean> {
        let now = new Date();
        let queryCmd: string =
            'INSERT INTO ' + tableName + '(dbsavetime,gatewaytimming,gatewaydata) VALUES($1,$2,$3)'
        let value: any[] = [now, data.Datetime, data];
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
    //-----------------------------------------------------------------------------------
    queryAll(tableName: string): Promise<PG.QueryResult> {
        let queryCmd: string =
            'SELECT dbsavetime,gatewaytimming,gatewaydata ' +
            'FROM ' + tableName + ' ' +
            'ORDER BY dbsavetime ASC ';

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
    querylatest(tableName: string): Promise<PG.QueryResult> {
        let queryCmd: string =
            'SELECT dbsavetime,gatewaytimming,gatewaydata ' +
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



/*

let isDelTable: boolean = false;

export class PgControl {


    pgClient = new Client({
        user: 'postgres',
        host: 'localhost',//127.0.0.1
        database: 'iot',
        password: 'postgres',
        port: 5432,
    })



    createTableCmd: string = 'CREATE TABLE IF NOT EXISTS tableSensor(id serial PRIMARY KEY , info JSONB, saveTime timestamp WITH TIME ZONE DEFAULT now())';
    insertCmd: string = 'INSERT INTO tableSensor(info) VALUES($1)';
    queryAllCmd: string = 'SELECT * FROM tableSensor';
    queryFirstCmd: string = 'SELECT * FROM tableSensor ORDER BY id ASC LIMIT 1';
    queryLastCmd: string = 'SELECT * FROM tableSensor ORDER BY id desc LIMIT 1';
    delAllCmd: string = 'DELETE FROM tableSensor';
    dropTableCmd: string = 'DROP TABLE IF EXISTS tableSensor'




    constructor() {

        this.begin();
    }

    async begin() {
        await this.connectDB();
        if (isDelTable) {
            await this.DelTable();
        }
        await this.createTable();
        await this.writeToDB(21, 50, true);
        await this.readAllDB();
       // await this.readLastDB();
    }

    async connectDB() {
        await this.pgClient.connect();
    }

    async DelTable() {
        await this.pgClient.query(this.dropTableCmd);
    }
    //create table
    async createTable() {

        await this.pgClient.query(this.createTableCmd);
        //  await this.pgClient.end()
    }


    async writeToDB(temp: number, hum: number, light: boolean) {

        let data = {
            temperature: temp,
            humidity: hum,
            lightStatus: light
        }

        await this.pgClient.query(this.insertCmd, [data]);

    }

    async readAllDB() {
        const res = await this.pgClient.query(this.queryAllCmd);
        res.rows.forEach(row => {
            console.log('id=');
            console.log(row.id);
            console.log('info=');
            console.log(row.info);
            console.log('savetime=');
            console.log((new Date(row.savetime)).toLocaleString('zh-tw'));
        });
    }


    async readFistDB() {
        const res = await this.pgClient.query(this.queryFirstCmd);
        res.rows.forEach(row => {
            console.log('id=');
            console.log(row.id);
            console.log('info=');
            console.log(row.info);
            console.log('savetime=');
            console.log((new Date(row.savetime)).toLocaleString('zh-tw'));
        });
    }

    async readLastDB() {
        const res = await this.pgClient.query(this.queryLastCmd);
        res.rows.forEach(row => {
            console.log('id=');
            console.log(row.id);
            console.log('info=');
            console.log(row.info);
            console.log('savetime=');
            console.log((new Date(row.savetime)).toLocaleString('zh-tw'));
        });
    }

    async delAll() {
        const res = await this.pgClient.query(this.delAllCmd);

    }

}


*/