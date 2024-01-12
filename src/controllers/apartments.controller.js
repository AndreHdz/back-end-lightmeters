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

router.get('/:id/get-energy', async (req,res) => {
    const apartmentId = req.params.id
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const energy = await service.getAparmentEnergy(apartmentId, startDate,endDate)

    if(apartmentId == 0)
        res.status(404).json('error')
    else
        res.send(energy)

})

module.exports = router;