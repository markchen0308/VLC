"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PG = require("pg");
const fs = require("fs");
let configfilePath = './config.json';
class PgControl {
    constructor() {
        this.connectDB()
            .then((val) => {
        })
            .catch((val) => {
        });
    }
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
}
exports.PgControl = PgControl;
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
//# sourceMappingURL=pgControl.js.map