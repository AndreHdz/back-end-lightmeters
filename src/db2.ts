const mysql2 = require('mysql2/promise');

const mysqlPool2 = mysql2.createPool({
    host: 'janperez.com',
    user: 'janperez_lightmeterapp',
    password: 'Gid(?=C^M4E}',
    database : 'janperez_lightmeterapp'
})

module.exports = mysqlPool2