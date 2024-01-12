const db = require('../db2')

module.exports.getAllApartments = async () => {
    const [rows] = await db.query("SELECT * FROM apartments")
    return rows
}

module.exports.getAparmentById = async (id) => {
    const [record] = await db.query("SELECT * FROM apartments WHERE id =" + id)
    return record;
}

module.exports.getAparmentEnergy = async (id, startDate, endDate) => {
    const energyTotal = {};
    let energyReadings = null;
    


    let [MetersSerialNumbers] = await db.query("SELECT serial_number FROM lightmeters WHERE apartment_id=" + id)

    if (MetersSerialNumbers.length > 0 ){
        const firstMeter = MetersSerialNumbers[0].serial_number;
        const secondMeter = MetersSerialNumbers[1].serial_number;
        energyReadings = await db.query(`SELECT * FROM readings WHERE (DATE(registration_date) = "${startDate}" OR DATE(registration_date) = "${endDate}") AND (meter_sn = "${firstMeter}" OR meter_sn = "${secondMeter}")`)
        energyReadings[0].forEach(({meter_id, energy})=> {
            if(energyTotal[meter_id] !== undefined){
                if (energy > energyTotal[meter_id]) {
                    // Si la energía actual es mayor que la almacenada, actualizamos la diferencia
                    energyTotal[meter_id] = energy - energyTotal[meter_id];
                }
            } else {
                // Inicializamos la diferencia con la energía actual
                energyTotal[meter_id] = energy;
            }

        })
        
    }
    return energyTotal;
}