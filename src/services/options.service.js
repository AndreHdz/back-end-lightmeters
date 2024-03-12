const db = require('../db2')

module.exports.getOption = async (option) => {
    const [optionValue] = await db.query("SELECT * FROM options WHERE option_name = ?;", option)
    return optionValue[0]
}