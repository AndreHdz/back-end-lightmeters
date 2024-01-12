const db = require('../db2')

module.exports.getAllCabinets = async () => {
    const [rows] = await db.query("SELECT * FROM cabinets")
    return rows
}

module.exports.getCabinetById = async (id) => {
    const [record] = await db.query("SELECT * FROM cabinets WHERE id =" + id)
    return record;
}