import "dotenv/config";
import  express  from "express";
import cors from "cors";
require('./tasks/lightMeterEnergy')

const lightMeters = require('./controllers/lightmeters.controller')
const readings = require('./controllers/readings.controller')
const cabinets = require('./controllers/cabinets.controller')
const apartments = require('./controllers/apartments.controller')
const invoices = require('./controllers/invoices.controller')

const PORT = process.env.PORT || 3003;
const app = express();
app.use(cors());
app.listen(PORT, () => console.log(`listo por el puerto ${PORT}`))

app.use('/api/light-meters', lightMeters);
app.use('/api/readings', readings);
app.use('/api/cabinets', cabinets);
app.use('/api/apartments', apartments);
app.use('/api/invoices', invoices);
