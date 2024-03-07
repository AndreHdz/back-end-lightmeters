const mysql2 = require('mysql2/promise');

const mysqlPool2 = mysql2.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database : 'lightmeters_back2'
})

module.exports = mysqlPool2