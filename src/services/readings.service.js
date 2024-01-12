const db = require('../db2')

module.exports.getAllReadings = async () => {
    const [rows] = await db.query("SELECT * FROM readings")
    return rows
}

module.exports.getReadingByMeterId = async (id) => {
    const [record] = await db.query("SELECT * FROM readings WHERE id =" + id)
    return record;
}