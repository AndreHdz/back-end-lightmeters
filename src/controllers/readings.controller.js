const express = require('express')
const router = express.Router();
const service = require('../services/readings.service')


router.get('/', async (req, res) => {
    const readings = await service.getAllReadings()
    res.send(readings)
})

router.get('/get-energy-apartments', async(req,res) => {
    const date = await service.getReadinsgByApartment(req.query.date);
    if( !date )
        res.status(404).json('insert a date')
    else
        res.send(date)
})

router.get('/get-energy', async(req,res) => {
    const date = await service.getReadinsgByDate(req.query.date);
    if( !date )
        res.status(404).json('insert a date')
    else
        res.send(date)
})



router.get('/:id', async (req,res) => {
    const reading = await service.getReadingByMeterId(req.params.id)
    if( reading == 0)
        res.status(404).json('no record with given id:' + (req.params.id))
    else
        res.send(reading)
})



module.exports = router;