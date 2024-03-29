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

    async function calculateEnergy(lightmeters){
        let energy = [];
        let totalEnergy = 0;
        for(let i=0; i < lightmeters.length ; i++){
            let lightmeterId =  lightmeters[i].id
            let lightmeterSn =  lightmeters[i].serial_number
            const energyA = await searchEnergy(startDate, lightmeterId);
            const energyB = await searchEnergy(endDate, lightmeterId);

            if (!energyA) {
                return {error : `No se encontraron datos válidos para energia A - ${lightmeterSn}`};
            } else if (!energyB) {
                return {error : `No se encontraron datos válidos para energia B -  ${lightmeterSn}`};

            }

            let diffEnergy = energyB.energy - energyA.energy;
            totalEnergy += diffEnergy;
            energy.push({
                lightmeterId : lightmeterId,
                lightmeterSn : lightmeterSn,
                energyTotal : parseFloat(diffEnergy.toFixed(2)),
                energy: {
                    a : energyA,
                    b: energyB,
                }
            });
        }

        return {total: parseFloat(totalEnergy.toFixed(2)), startDate: startDate, endDate: endDate, data: energy};
    }
    
    return {apartmentInfo: await getApartmentInfo(id), lightmeters: await getLightmeters(id), energy : await calculateEnergy(await getLightmeters(id))}
}