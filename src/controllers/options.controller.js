const express = require('express')
const router = express.Router();
const service = require('../services/options.service')

router.get('/:options', async (req,res) => {
    const optionName =  req.params.options;
    const [option] = await service.getOption(optionName)
    res.send(option)
})


module.exports = router;