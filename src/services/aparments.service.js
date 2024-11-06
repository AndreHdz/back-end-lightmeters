const db = require('../db2')

module.exports.getAllApartments = async () => {
    const [rows] = await db.query(`
        SELECT 
          apartments.id AS apartment_id, 
          apartments.apartment_number, 
          apartments.apartment_owner, 
          apartments.service_key, 
          apartments.meter_type, 
          GROUP_CONCAT(DISTINCT lightmeters.serial_number) AS serial_numbers,
          GROUP_CONCAT(DISTINCT lightmeters.cabinet_id) AS cabinet_ids  -- Usa GROUP_CONCAT si necesitas todos los cabinet_id
        FROM 
          apartments 
        LEFT JOIN 
          lightmeters ON lightmeters.apartment_id = apartments.id 
        GROUP BY 
          apartments.id, 
          apartments.apartment_number, 
          apartments.apartment_owner, 
          apartments.service_key, 
          apartments.meter_type
        ORDER BY 
          CAST(SUBSTRING_INDEX(apartments.apartment_number, '-', 1) AS UNSIGNED) ASC, 
          apartments.apartment_number ASC;
      `);
      
    return rows
}

module.exports.getAparmentById = async (id) => {
    const [record] = await db.query("SELECT * FROM apartments WHERE id =" + id)
    const [meters] = await db.query("SELECT * FROM lightmeters WHERE apartment_id=" + id);
    return {record, meters};
}

module.exports.updateApartmentOwner = async (id, apartmentOwner) => {
    const [result] = await db.query("UPDATE apartments SET apartment_owner = ? WHERE id = ?", [apartmentOwner, id])
    return result;
};

module.exports.getAparmentEnergy = async (id, startDate, endDate) => {
    async function searchEnergy(date, meterId){
        const [records] = await db.query("SELECT * FROM `readings` WHERE DATE(registration_date) = ? AND meter_id = ? ORDER BY energy ASC;", [date, meterId]);
        if(!records){
            return { error: "No se encontraron registros:", fecha: date, meterId: meterId}
        }
        return records[0];
    } 

    async function getLightmeters(id){
        const [lightmeters] = await db.query("SELECT * FROM `lightmeters` WHERE apartment_id = ?", id)
        return lightmeters;
    }

    async function getApartmentInfo(id){
        const apartment = await db.query("SELECT * FROM `apartments` WHERE id = ?" , id)
        return apartment[0];
    }
    async function calculateEnergy(lightmeters) {
        let energy = [];
        let totalEnergy = 0;
    
        for (let i = 0; i < lightmeters.length; i++) {
            let lightmeterId = lightmeters[i].id;
            let lightmeterSn = lightmeters[i].serial_number;
    
            const energyA = await searchEnergy(startDate, lightmeterId);
            const energyB = await searchEnergy(endDate, lightmeterId);
            let diffEnergy = 0;
    
            // Caso donde faltan ambos datos de energía A y B
            if (!energyA && !energyB) {
                energy.push({
                    lightmeterId: lightmeterId,
                    lightmeterSn: lightmeterSn,
                    energyTotal: 0,
                    energy: { a: null, b: null },
                    warning: `No se encontraron datos válidos para energía A y B - ${lightmeterSn}`,
                });
                continue;  // Saltar a la siguiente iteración
            }
    
            // Caso donde falta solo `energyA`
            if (!energyA) {
                energy.push({
                    lightmeterId: lightmeterId,
                    lightmeterSn: lightmeterSn,
                    energyTotal: 0,
                    energy: { a: null, b: energyB },
                    warning: `No se encontraron datos válidos para energía A - ${lightmeterSn}`,
                });
                continue;
            }
    
            // Caso donde falta solo `energyB`
            if (!energyB) {
                energy.push({
                    lightmeterId: lightmeterId,
                    lightmeterSn: lightmeterSn,
                    energyTotal: 0,
                    energy: { a: energyA, b: null },
                    warning: `No se encontraron datos válidos para energía B - ${lightmeterSn}`,
                });
                continue;
            }
    
            // Caso donde ambos valores están presentes
            diffEnergy = energyB.energy - energyA.energy;
            totalEnergy += diffEnergy;
    
            energy.push({
                lightmeterId: lightmeterId,
                lightmeterSn: lightmeterSn,
                energyTotal: parseFloat(diffEnergy.toFixed(2)),
                energy: {
                    a: energyA,
                    b: energyB,
                }
            });
        }
    
        return {
            total: parseFloat(totalEnergy.toFixed(2)),
            startDate: startDate,
            endDate: endDate,
            data: energy
        };
    }
    
    
    
    return {apartmentInfo: await getApartmentInfo(id), lightmeters: await getLightmeters(id), energy : await calculateEnergy(await getLightmeters(id))}
}


module.exports.getAllApartmentsEnergy = async (startDate, endDate) => {
    const [apartmentsId] = await db.query('SELECT id FROM apartments');
    const apartmentEnergyPromises = apartmentsId.map(apartment => 
        this.getAparmentEnergy(apartment.id, startDate, endDate)
    );
    const apartmentsEnergyData = await Promise.all(apartmentEnergyPromises);
    return apartmentsEnergyData;
};



module.exports.getAllApartmentsTotalEnergy = async (date) => {
    const [records] = await db.query(`SELECT r1.meter_sn, MAX(r1.energy) AS max_energy, r1.registration_date
    FROM readings r1
    WHERE DATE(r1.registration_date) = ?
    GROUP BY r1.meter_sn;`, [date])

    if(!records){
        return
    }
    return records
}