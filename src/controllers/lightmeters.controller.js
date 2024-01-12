const express = require('express');
const router = express.Router();
const service = require('../services/lightmeter.service')

router.get('/',async (req, res) => {
    const meters = await service.getAllLightMeters();
    res.send(meters)
})

router.get('/:id', async (req, res) =>{
    const meter = await service.getLightMeterById(req.params.id);
    if(meter.length == 0)
        res.status(404).json('no record with given id:' + req.params.id)
    else
        res.send(meter)
})



module.exports = router;