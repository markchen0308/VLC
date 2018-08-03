"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
let isDelTable = false;
class PgControl {
    constructor() {
        this.pgClient = new pg_1.Client({
            user: 'postgres',
            host: 'localhost',
            database: 'iot',
            password: 'postgres',
            port: 5432,
        });
        this.createTableCmd = 'CREATE TABLE IF NOT EXISTS tableSensor(id serial PRIMARY KEY , info JSONB, saveTime timestamp WITH TIME ZONE DEFAULT now())';
        this.insertCmd = 'INSERT INTO tableSensor(info) VALUES($1)';
        this.queryAllCmd = 'SELECT * FROM tableSensor';
        this.queryFirstCmd = 'SELECT * FROM tableSensor ORDER BY id ASC LIMIT 1';
        this.queryLastCmd = 'SELECT * FROM tableSensor ORDER BY id desc LIMIT 1';
        this.delAllCmd = 'DELETE FROM tableSensor';
        this.dropTableCmd = 'DROP TABLE IF EXISTS tableSensor';
        this.begin();
    }
    begin() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectDB();
            if (isDelTable) {
                yield this.DelTable();
            }
            yield this.createTable();
            yield this.writeToDB(21, 50, true);
            yield this.readAllDB();
            // await this.readLastDB();
        });
    }
    connectDB() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pgClient.connect();
        });
    }
    DelTable() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pgClient.query(this.dropTableCmd);
        });
    }
    //create table
    createTable() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pgClient.query(this.createTableCmd);
            //  await this.pgClient.end()
        });
    }
    writeToDB(temp, hum, light) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = {
                temperature: temp,
                humidity: hum,
                lightStatus: light
            };
            yield this.pgClient.query(this.insertCmd, [data]);
        });
    }
    readAllDB() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.pgClient.query(this.queryAllCmd);
            res.rows.forEach(row => {
                console.log('id=');
                console.log(row.id);
                console.log('info=');
                console.log(row.info);
                console.log('savetime=');
                console.log((new Date(row.savetime)).toLocaleString('zh-tw'));
            });
        });
    }
    readFistDB() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.pgClient.query(this.queryFirstCmd);
            res.rows.forEach(row => {
                console.log('id=');
                console.log(row.id);
                console.log('info=');
                console.log(row.info);
                console.log('savetime=');
                console.log((new Date(row.savetime)).toLocaleString('zh-tw'));
            });
        });
    }
    readLastDB() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.pgClient.query(this.queryLastCmd);
            res.rows.forEach(row => {
                console.log('id=');
                console.log(row.id);
                console.log('info=');
                console.log(row.info);
                console.log('savetime=');
                console.log((new Date(row.savetime)).toLocaleString('zh-tw'));
            });
        });
    }
    delAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.pgClient.query(this.delAllCmd);
        });
    }
}
exports.PgControl = PgControl;
