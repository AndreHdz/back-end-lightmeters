const express = require('express')
const router = express.Router();
const service = require('../services/aparments.service')


router.get('/', async (req, res) => {
    const aparments = await service.getAllApartments()
    res.send(aparments)
})

router.get('/:id', async (req,res) => {
    const apartmentId = req.params.id
    const apartment = await service.getAparmentById(apartmentId)
    if( apartment == 0)
        res.status(404).json('no record with given id:' + (apartmentId))
    else
        res.send(apartment)
})

router.get('/:id/get-energy', async (req, res) => {
    const apartmentId = req.params.id;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const energy = await service.getAparmentEnergy(apartmentId, startDate, endDate);
    console.log(energy)


    if (Object.keys(energy.energyTotal).length == 0) {
        res.status(404).json('Error, no se encontro ninguna lectura');
    } else if (Object.keys(energy.energyTotal).length == 1){
        res.status(404).json('Error, no se solo 1 lectura');
    } else if (energy.sum == 0){
        res.status(404).json('Error, alguno de los medidores no envío la cantidad de energía')
    } else {
        res.send(energy);
    }
});


module.exports = router;