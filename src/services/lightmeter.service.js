const db = require('../db2')


module.exports.getAllLightMeters = async () => {
    const [rows] = await db.query("SELECT * FROM lightmeters")
    return rows
}

module.exports.getLightMeterById = async (id) => {
    const [record] = await db.query("SELECT * FROM lightmeters WHERE id = " +id)
    return record
}