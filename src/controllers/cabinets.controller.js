const express = require('express')
const router = express.Router();
const service = require('../services/cabinets.service')


router.get('/', async (req, res) => {
    const cabinets = await service.getAllCabinets()
    res.send(cabinets)
})

router.get('/:id', async (req,res) => {
    const cabinet = await service.getCabinetById(req.params.id)
    if( cabinet == 0)
        res.status(404).json('no record with given id:' + (req.params.id))
    else
        res.send(cabinet)
})

module.exports = router;