const cron = require("node-cron");
const db = require("../db");
const db2 = require("../db2");

// Define la tarea cron para ejecutar a las 6 PM todos los días
cron.schedule("*/10 * * * * *", async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const [records] = await db.query(
            `
            SELECT energya AS energy, 
                    readings.meter_registration_date AS registration_date, 
                    serial_number 
            FROM readings  
            INNER JOIN meter ON readings.meter_id = meter.id
            WHERE DATE(readings.meter_registration_date) = "${today}" AND EXTRACT(HOUR FROM readings.meter_registration_date) = 6`
        );
        if (records.length >= 0) {
            for(let i = 0; i < records.length; i++){
                const serialNumber = records[i].serial_number;
                const id = await db2.query(`SELECT id FROM lightmeters WHERE serial_number = "${serialNumber}"`)  
                records[i] = {meter_id : id[0][0].id, ...records[i]}
                await db2.query(`
                INSERT INTO readings (meter_id, energy, registration_date, meter_sn)
                VALUES (?, ?, ?, ?)
            `, [records[i].meter_id, records[i].energy, records[i].registration_date, records[i].serial_number]);
            }
            console.log(records)
        } else {
            console.log("No hay datos");
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY'){
            console.error("Error: records are already in db")
        } else {
            console.error("Error en la tarea cron:", error);
        }
    }
});


