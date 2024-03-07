const db = require('../db2')

module.exports.getAllApartments = async () => {
    const [rows] = await db.query("SELECT * FROM apartments")
    return rows
}

module.exports.getAparmentById = async (id) => {
    const [record] = await db.query("SELECT * FROM apartments WHERE id =" + id)
    const [meters] = await db.query("SELECT * FROM lightmeters WHERE apartment_id=" + id);
    return {record, meters};
}

module.exports.getAparmentEnergy = async (id, startDate, endDate) => {
    const energyTotal = {};
    let energyReadings = null;
    let sum = 0;

    let [MetersSerialNumbers] = await db.query("SELECT serial_number FROM lightmeters WHERE apartment_id=" + id)

    if (MetersSerialNumbers.length > 0 ){
        const firstMeter = MetersSerialNumbers[0].serial_number;
        const secondMeter = MetersSerialNumbers[1].serial_number;
        energyReadings = await db.query(`SELECT meter_sn, energy, registration_date
        FROM (
            SELECT 
                meter_sn, 
                energy, 
                registration_date,
                ROW_NUMBER() OVER(PARTITION BY DATE(registration_date), meter_sn ORDER BY energy DESC) AS row_num
            FROM 
                readings
            WHERE 
                (DATE(registration_date) = "${startDate}" OR DATE(registration_date) = "${endDate}") 
                AND (meter_sn = "${firstMeter}" OR meter_sn = "${secondMeter}")
        ) AS ranked
        WHERE 
            row_num = 1;
    `)
        console.log(energyReadings);
        energyReadings[0].forEach(({meter_sn, energy})=> {
            if(energyTotal[meter_sn] !== undefined){
                if (energy > energyTotal[meter_sn]) {
                    energyTotal[meter_sn] = energy - energyTotal[meter_sn];
                } 
            } else {
                // Inicializamos la diferencia con la energía actual
                energyTotal[meter_sn] = energy;
            }
            
            // Si no hay otra lectura para este medidor, establecer el valor en null
            if (energyReadings[0].filter(item => item.meter_sn === meter_sn).length < 2) {
                energyTotal[meter_sn] = null;
            }
        })
    }

    for(let key in energyTotal){
        sum += energyTotal[key];
    }

    return {energyTotal, sum : Number(sum.toFixed(2))};
}