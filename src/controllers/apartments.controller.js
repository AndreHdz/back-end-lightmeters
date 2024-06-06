const express = require('express')
const router = express.Router();
const service = require('../services/aparments.service');
const getYesterday = require('../lib/getYesterday');


router.get('/', async (req, res) => {
    const aparments = await service.getAllApartments()
    res.send(aparments)
})

router.get('/all-energy', async (req,res) => {
    const today = req.query.date;
    const yesterday = getYesterday(today);


    if(!today){
        return res.status(400).send({error: 'El parámetro date es obligatorio'})
    }

    try{
        const recordsA = await service.getAllApartmentsTotalEnergy(today);
        const recordsB = await service.getAllApartmentsTotalEnergy(yesterday);
        if(!recordsA || !recordsB){
            return res.status(500).send({error: 'No hay lecturas para alguna fecha'})
        }

        // Crear un objeto para almacenar los totales de energía por SN
        const energyTotalsToday = {};
        const energyTotalsYesterday = {};

        // Calcular los totales de energía por SN para hoy
        recordsA.forEach(record => {
            energyTotalsToday[record.meter_sn] = (energyTotalsToday[record.meter_sn] || 0) + record.max_energy;
        });

        // Calcular los totales de energía por SN para ayer
        recordsB.forEach(record => {
            energyTotalsYesterday[record.meter_sn] = (energyTotalsYesterday[record.meter_sn] || 0) + record.max_energy;
        });

        // Calcular la diferencia de energía para cada SN
        const energyDifferences = {};
        Object.keys(energyTotalsToday).forEach(sn => {
            if (energyTotalsYesterday[sn]) {
                energyDifferences[sn] = energyTotalsToday[sn] - energyTotalsYesterday[sn];
            }
        });

        // Calcular la suma de las diferencias de energía
        let energyDifferenceSum = 0;
        Object.values(energyDifferences).forEach(diff => {
            energyDifferenceSum += diff;
        });

        res.send({ energyDifferences, energySum : parseFloat(energyDifferenceSum).toFixed(2)});

    } catch(error){
        console.error(error);
        res.status(500).send({error: 'Error al obtener las lecturas'})
    }
});

router.get('/energy', async (req,res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).send({ error: 'Los parámetros startDate y endDate son obligatorios.' });
    }

    try {
        const energyData = await service.getAllApartmentsEnergy(startDate, endDate);
        res.send(energyData);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener los datos de energía.' });
    }
})



router.get('/:id', async (req,res) => {
    const apartmentId = req.params.id
    const apartment = await service.getAparmentById(apartmentId)
    if( apartment == 0)
        res.status(404).json('no record with given id:' + (apartmentId))
    else
        res.send(apartment)
})



router.patch('/:id', async (req,res) => {
    const apartmentId = req.params.id;
    const {apartment_owner} = req.body;

    if(!apartment_owner){
        return res.status(400).send({error: 'El campo apartment_owner es obligatorio'})
    }
    try {
        const result = await service.updateApartmentOwner(apartmentId, apartment_owner);
        if(result.affectedRows === 0) {
            return res.status(404).send({ error: 'Apartamento no encontrado'})
        }
        res.send({message : 'Propietario actualizado con exito'})
    }catch (err) {
        console.error(err);
        res.status(500).send({error: 'Error al actualizar el propietario del apartamento'})
    }
})


router.get('/:id/get-energy', async (req, res) => {
    const apartmentId = req.params.id;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const energy = await service.getAparmentEnergy(apartmentId, startDate, endDate);
    
    //res.send(energy)
     if (energy.sum == 0){
        res.status(404).json('Error, alguno de los medidores no envío la cantidad de energía')
    } else {
        res.send(energy);
    }
});





module.exports = router;