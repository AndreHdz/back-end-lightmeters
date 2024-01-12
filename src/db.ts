const mysql = require('mysql2/promise');

const mysqlPool = mysql.createPool({
    host: 'janperez.com',
    user: 'janperez_luz2',
    password: 'u_!jqSx2TDpp',
    database : 'janperez_luz2'
})

module.exports = mysqlPool