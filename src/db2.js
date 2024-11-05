const mysql2 = require('mysql2/promise');
require("dotenv/config");


const HOST = process.env.LOCAL_DB_HOST;
const USER = process.env.LOCAL_DB_USER;
const PASSWORD = process.env.LOCAL_DB_PASSWORD
const DB = process.env.LOCAL_DB_NAME


const mysqlPool2 = mysql2.createPool({
    host: HOST,
    user: USER,
    password: PASSWORD,
    database : DB
})

module.exports = mysqlPool2