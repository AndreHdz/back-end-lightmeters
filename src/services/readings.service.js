const db = require('../db2')

module.exports.getAllReadings = async () => {
    const [rows] = await db.query("SELECT * FROM readings")
    return rows
}

module.exports.getReadingByMeterId = async (id) => {
    const [record] = await db.query("SELECT * FROM readings WHERE id = ?", id)
    return record;
}

module.exports.getReadinsgByDate = async (date) => {
    const day = new Date(date);
    day.setDate(day.getDate() - 1);
    const prevDay = day.toISOString().split('T')[0];

    const [records] = await db.query("SELECT * FROM readings WHERE DATE(registration_date) = ?", date);
    const [recordsPrevDay] = await db.query("SELECT * FROM readings WHERE DATE(registration_date) = ?", prevDay);


    //Validar que encuentre lecturas en ambas fechas
    if (records.length === 0 || recordsPrevDay.length === 0) {
        return { diferenciaEnergia: 0, mensaje: "Solo se obtuvo registros para una fecha." };
    }

    let dif = 0;

    for(let i = 0; i < records.length; i++){
        const registroActual = records[i];
        const registroAnterior = recordsPrevDay.find(prevRegister => prevRegister.meter_id === registroActual.meter_id);

        if ( registroAnterior ){
            dif = registroActual.energy - registroAnterior.energy;
            registroActual.energy = dif;
        } else {
            registroActual.energy = 0;
        }
    }

    return records
}


module.exports.getReadinsgByApartment = async (date) => {
    const day = new Date(date);
    day.setDate(day.getDate() - 1);
    const prevDay = day.toISOString().split('T')[0];

    const [records] = await db.query("SELECT * FROM readings WHERE DATE(registration_date) = ?", date);
    const [recordsPrevDay] = await db.query("SELECT * FROM readings WHERE DATE(registration_date) = ?", prevDay);


    //Validar que encuentre lecturas en ambas fechas
    if (records.length === 0 || recordsPrevDay.length === 0) {
        return { diferenciaEnergia: 0, mensaje: "Solo se obtuvo registros para una fecha." };
    }

    let dif = 0;

    for(let i = 0; i < records.length; i++){
        const registroActual = records[i];
        const registroAnterior = recordsPrevDay.find(prevRegister => prevRegister.meter_id === registroActual.meter_id);

        if ( registroAnterior ){
            dif = registroActual.energy - registroAnterior.energy;
            registroActual.energy = dif;
        } else {
            registroActual.energy = 0;
        }
    }

    //Codigo para energia por apartamentos y serial numbers
    const [apartments] = await db.query("SELECT apartments.apartment_number, apartments.apartment_owner, GROUP_CONCAT(lightmeters.serial_number) AS serial_numbers FROM lightmeters INNER JOIN apartments ON lightmeters.apartment_id = apartments.id GROUP BY apartments.apartment_number;");

    //Sumar energias por departamento
    for(let i = 0; i < apartments.length; i++){
        const apartment = apartments[i];
        apartment.serial_numbers = apartment.serial_numbers.split(",")
        apartment.total_energy = 0;
        for(let j = 0; j < apartment.serial_numbers.length; j++){
            const serialNumber = apartment.serial_numbers[j];

            for(let k = 0; k < records.length; k++){
                const record = records[k];
                if(record.meter_sn === serialNumber){
                    apartment.total_energy += record.energy
                }
            } 
        }
        apartment.total_energy = parseFloat(apartment.total_energy.toFixed(2));
    }

    apartments.sort((a,b) => b.total_energy - a.total_energy)


    return apartments;
}