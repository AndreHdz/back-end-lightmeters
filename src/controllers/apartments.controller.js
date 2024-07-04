const express = require('express')
const router = express.Router();
const service = require('../services/aparments.service');
const getYesterday = require('../lib/getYesterday');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 8 * 24 * 60 * 60 }); 

router.get('/', async (req, res) => {
    const aparments = await service.getAllApartments()
    res.send(aparments)
})

router.get('/all-energy', async (req, res) => {
    const today = req.query.date;

    if (!today) {
        return res.status(400).send({ error: 'El parámetro date es obligatorio' });
    }

    const yesterday = getYesterday(today);
    const cacheKey = `${yesterday}_${today}`;

    // Verificar si los datos están en la caché
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log('Usando datos de la caché');
        return res.send(cachedData);
    }

    try {
        const records = await service.getAllApartmentsEnergy(yesterday, today);
        console.log(records);

        const energyDifferenceSum = records.reduce((sum, record) => sum + (record.energy.total || 0), 0);
        console.log(energyDifferenceSum);

        const responseData = {
            energyDifferences: records,
            energySum: parseFloat(energyDifferenceSum).toFixed(2)
        };

        // Guardar los datos en la caché
        cache.set(cacheKey, responseData);

        res.send(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener las lecturas' });
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