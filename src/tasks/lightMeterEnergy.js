require('dotenv/config')
const cron = require("node-cron");
const mysql = require('mysql2/promise');
const db2 = require("../db2");
const date = require("../lib/formatDate");
const ping =  require("ping");
const serviceApartments = require("../services/aparments.service");
const formatPeriod = require('../lib/formatPeriod');

async function doPing(ip) {
    try {
        const res = await ping.promise.probe(ip);
        return res.alive;
    } catch (error) {
        console.error(`Error al hacer ping a ${ip}:`, error);
        return false;
    }
}


// TAREA OBTENER LA MEDICIONES, SE EJECUTA CADA MEDIA HORA
cron.schedule("*/30 * * * *", async () => {
    const formattedDate = date();
    const [ips] = await db2.query("SELECT ip, cabinet_number FROM cabinets");

    const USER = process.env.REMOTE_DB_USER;
    const NAME = process.env.REMOTE_DB_NAME;
    const PASSWORD = process.env.REMOTE_DB_PASSWORD;
    const PORT = process.env.REMOTE_DB_PORT;


    for(let i = 0; i < ips.length; i++){
        let ip = ips[i].ip;
        let cabinetNumber = ips[i].cabinet_number
        const db = mysql.createPool({
            host: ip,
            user: USER,
            password: PASSWORD,
            database : NAME,
            port: PORT 
        })

        try {
            const [records] = await db.query(
                `
                SELECT energya AS energy, 
                        last_readings.meter_registration_date AS registration_date, 
                        serial_number 
                FROM last_readings  
                INNER JOIN meter ON last_readings.meter_id = meter.id
                WHERE DATE(last_readings.meter_registration_date) = "${formattedDate}"`
            );
                if (records.length > 0) {	
                    for (let j = 0; j < records.length; j++) {
                        const serialNumber = records[j].serial_number;
                        const result = await db2.query(`SELECT id FROM lightmeters WHERE serial_number = "${serialNumber}"`);
    
                        if (result && result[0] && result[0][0] && result[0][0].id) {
                            records[j] = { meter_id: result[0][0].id, ...records[j] };
    
                            // Realizar la inserción solo si se obtuvo un valor para 'id'
                            const results = await db2.query(`
                                INSERT INTO readings (meter_id, energy, registration_date, meter_sn)
                                VALUES (?, ?, ?, ?)
                            `, [records[j].meter_id, records[j].energy, records[j].registration_date, records[j].serial_number]);
                            
                            console.log(`${[j]}.- Intento de inserción para el medidor con número de serie '${records[j].serial_number}' y energía ${records[j].energy}.`);
    
                            
                        } else {
                            console.error(`No se encontró el 'id' para el número de serie '${serialNumber}'.`);
                        }
                    }
                    
                } else {
                    console.log(`No hay datos para el Gabinete:${cabinetNumber} con la ip:${ip}`);
                }
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY'){
                    console.error(`Duplicated reg for '${serialNumber}'`)
                } else if(error.code === 'ETIMEDOUT' || error.code === 'EHOSTUNREACH'){
                    console.error(`No hay conexión para la ip ${ip}`)
                } else {
                    console.error("Error en la tarea cron:", error);
                }
            }
    }
});



//TAREA PARA ACTUALIZA ESTATUS DE LOS MEDIDORES
cron.schedule("*/10 * * * * *", async () => {
    const formattedDate = date();
    //console.log(formattedDate);
    try {
        // Primero, actualizar todos los medidores a estado 0
        await db2.query(
            `
            UPDATE lightmeters
            SET status = 0`
        );

        // Luego, obtener los registros para la fecha especificada
        const [records] = await db2.query(
            `
            SELECT meter_id, registration_date
            FROM readings
            WHERE DATE(registration_date) = "${formattedDate}" `
        );

        // Actualizar el campo status para los registros obtenidos
        if (records && records.length > 0) {
            const updatePromises = records.map(async (record) => {
                await db2.query(
                    `
                    UPDATE lightmeters
                    SET status = 1
                    WHERE id = ?`,
                    [record.meter_id]
                );
            });
            await Promise.all(updatePromises);
            //console.log('Registros actualizados correctamente.');
        } else {
            //console.log('No hay registros para actualizar. Todos los medidores se han establecido en estado 0.');
        }
    } catch (error) {
        console.error("Error en la tarea cron:", error);
    }
});

//Tarea que hace PING y actualiza estado en BD

cron.schedule("*/5 * * * *", async () => {
    try{
        const [ips] = await db2.query(
            `SELECT ip FROM cabinets`   
        )
        for(const {ip} of ips){
            const isAlive = await doPing(ip);
            // console.log(`IP ${ip} está ${isAlive ? 'activa' : 'inactiva'}`);
            await db2.query(
                `UPDATE cabinets SET status = ? WHERE ip = ?`,
                [isAlive ? 1 : 0, ip]
            )
        }
    } catch (error){
        console.log(error)
    }
});

//Crear Reporte
/* (async () => {
    const startDate = "2024/02/01";
    const endDate = "2024/02/28";
    const data = await  serviceApartments.getAllApartmentsEnergy(startDate,endDate)
    console.log(data)
})();
 */


//Crear Invoices
/* 
( async () => {
    const startDate = "2024/06/01";
    const endDate = "2024/06/30";

    const period = formatPeriod(startDate)

    try{
        const [reportResult] = await db2.query('INSERT INTO reports (title, startDate, endDate) VALUES (?,?,?)',[`Reporte mensual ${period}`, startDate, endDate])
        const reportId = reportResult.insertId;
        console.log(`Reporte creado con ID: ${reportId}`)

        try{
            const [apartments] = await db2.query(`SELECT * FROM apartments`);
            let error = 0;
            for(let i = 0; i < apartments.length; i++){
                const apartment = apartments[i];
                const energyObjetct = await serviceApartments.getAparmentEnergy(apartment.id, startDate, endDate)
                if(energyObjetct.energy.total){
                    await db2.query(`INSERT INTO invoices (apartment_id, energy, start_date, end_date, report_id) VALUES (?, ?, ?, ?, ?)`,[energyObjetct.apartmentInfo[0].id, energyObjetct.energy.total, startDate, endDate, reportId])
                } else {
                    error++
                    await db2.query(`INSERT INTO invoices (apartment_id, energy, start_date, end_date, report_id) VALUES (?, ?, ?, ?, ?)`,[energyObjetct.apartmentInfo[0].id, 0, startDate, endDate, reportId])
                    console.log(`${error} - No se econtro energia para Departamento: ${apartment.apartment_number}`)
                }
            }
        }catch(err){
            console.error(err)
        }

    }catch(error){
        console.error('Error al crear Reporte')
    }
})();


 */

//Extraer DATOS XML
/* (async () => {
    try {
        const [records] = await db.query("SELECT registration_date, xml_data from message_pending_to_send");

        for (const record of records) {
            const energyValues = [];
            const xmlDocument = new DOMParser().parseFromString(record.xml_data, "text/xml");
            const readingsLists = xmlDocument.getElementsByTagName("readingsList");

            // Fecha
            const registrationDate = record.registration_date;
            const formattedDate = new Date(registrationDate);

            // Iterar sobre cada <readingsList>
            for (let i = 0; i < readingsLists.length; i++) {
                const readingsList = readingsLists[i];
                const textBeforeReadingsList = readingsList.previousSibling.textContent.trim();

                // Obtener el primer <reading> dentro de cada <readingsList>
                const readings = readingsList.getElementsByTagName("reading");
                if (readings.length > 0) {
                    const firstReading = readings[0];
                    const value = firstReading.getAttribute("value");
                    const id = await db2.query("SELECT id FROM lightmeters WHERE serial_number = ?", textBeforeReadingsList);
                    energyValues.push({ energy: value, date: formattedDate, meterNumber: textBeforeReadingsList, meter_id: id[0][0].id });
                }
            }

            console.log(energyValues);

            // HACER EL INSERT
            if (energyValues.length > 0) {
                const insertQuery = `
                    INSERT INTO readings (meter_id, energy, registration_date, meter_sn) 
                    VALUES ?
                `;

                const insertValues = energyValues.map(item => [item.meter_id, item.energy, item.date, item.meterNumber]);
                await db2.query(insertQuery, [insertValues]);
                console.log("Valores de energía insertados correctamente.");
            } else {
                console.log("No se encontraron valores de energía para insertar.");
            }
        }
    } catch (error) {
        console.error("Error en la tarea:", error)
    }
})(); */

