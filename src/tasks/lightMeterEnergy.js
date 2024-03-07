const cron = require("node-cron");
const { DOMParser } = require('xmldom');
const db = require("../db");
const db2 = require("../db2");
const date = require("../lib/date");
const ping =  require("ping");

async function doPing(ip) {
    try {
        const res = await ping.promise.probe(ip);
        return res.alive;
    } catch (error) {
        console.error(`Error al hacer ping a ${ip}:`, error);
        return false;
    }
}

// Define la tarea cron para ejecutar a las 6 PM todos los días
cron.schedule("*/30 * * * * *", async () => {
    const formattedDate = date();
	console.log(formattedDate)
	
    try {
        const [records] = await db.query(
            `
            SELECT energya AS energy, 
                    last_readings.meter_registration_date AS registration_date, 
                    serial_number 
            FROM last_readings  
            INNER JOIN meter ON last_readings.meter_id = meter.id
            WHERE DATE(last_readings.meter_registration_date) = "${formattedDate}" AND EXTRACT(HOUR FROM last_readings.meter_registration_date) = 12`
        );

        if (records.length > 0) {	
			for (let i = 0; i < records.length; i++) {
				const serialNumber = records[i].serial_number;
				const result = await db2.query(`SELECT id FROM lightmeters WHERE serial_number = "${serialNumber}"`);

				if (result && result[0] && result[0][0] && result[0][0].id) {
					records[i] = { meter_id: result[0][0].id, ...records[i] };

					// Realizar la inserción solo si se obtuvo un valor para 'id'
					const results = await db2.query(`
						INSERT INTO readings (meter_id, energy, registration_date, meter_sn)
						VALUES (?, ?, ?, ?)
					`, [records[i].meter_id, records[i].energy, records[i].registration_date, records[i].serial_number]);
					
					console.log(`${[i]}.- Intento de inserción para el medidor con número de serie '${records[i].serial_number}' y energía ${records[i].energy}.`);

					
				} else {
					console.error(`No se encontró el 'id' para el número de serie '${serialNumber}'.`);
				}
			}
            
        } else {
            console.log("No hay datos");
        }
		
		} catch (error) {
			if (error.code === 'ER_DUP_ENTRY'){
				console.error(`Duplicated reg for '${serialNumber}'`)
			} else {
				console.error("Error en la tarea cron:", error);
			}
		}
});


//Actualizar estado de Medidores de Luz
cron.schedule("*/30 * * * * *", async () => {
    const formattedDate = date();
    console.log(formattedDate);

    try {
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
            console.log('Registros actualizados correctamente.');
        } else {
            console.log('No hay registros para actualizar.');
        }
    } catch (error) {
        console.error("Error en la tarea cron:", error);
    }
});

cron.schedule("*/55 * * * * *", async () => {
    try{
        const [ips] = await db2.query(
            `SELECT ip FROM cabinets`   
        )
        for(const {ip} of ips){
            const isAlive = await doPing(ip);
            console.log(`IP ${ip} está ${isAlive ? 'activa' : 'inactiva'}`);
            await db2.query(
                `UPDATE cabinets SET status = ? WHERE ip = ?`,
                [isAlive ? 1 : 0, ip]
            )
        }
        console.log(ips)
    } catch (error){
        console.log(error)
    }
});


(async () => {
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
})();

