const express = require('express');
const router = express.Router();
const service = require('../services/auth.service')
const jwt = require('jsonwebtoken');

router.post('/', async(req,res) => {
    let username = req.body.username;
    let password = req.body.password;
    const user = await service.auth(username, password)
    if( user.length > 0){
        const token =  jwt.sign({username:username}, '02b086f0-a2d8-4854-bdb2-06c161457efa', {expiresIn: '1h'})
        res.json({username: username, token: token})
    } else {
        res.status(401).json({error : "Credenciales incorrectas"})
    }

})

module.exports = router