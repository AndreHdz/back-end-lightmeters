import "dotenv/config";
import cors from "cors";
const express = require('express')
const bodyParser = require('body-parser')
require('./tasks/lightMeterEnergy')

const lightMeters = require('./controllers/lightmeters.controller')
const readings = require('./controllers/readings.controller')
const cabinets = require('./controllers/cabinets.controller')
const apartments = require('./controllers/apartments.controller')
const invoices = require('./controllers/invoices.controller')
const options = require('./controllers/options.controller')

const PORT = process.env.PORT || 3003;
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.listen(PORT, () => console.log(`listo por el puerto ${PORT}`))

app.use('/api/light-meters', lightMeters);
app.use('/api/readings', readings);
app.use('/api/cabinets', cabinets);
app.use('/api/apartments', apartments);
app.use('/api/invoices', invoices);
app.use('/api/options', options);



