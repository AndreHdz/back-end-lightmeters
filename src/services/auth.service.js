const db = require('../db2')

module.exports.auth = async (username, password) => {
    const [user] = await db.query('SELECT * FROM users WHERE user = ? AND password = ?', [username,password])
    return user
}
