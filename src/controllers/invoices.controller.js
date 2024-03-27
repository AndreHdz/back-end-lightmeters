const express = require('express');
const router = express.Router();
const generatePDF = require('../lib/generatePDF')
const serviceInvoices = require('../services/invoices.service')
const service = require('../services/aparments.service');
const serviceOptions = require('../services/options.service')
const db = require('../db2')

const formatPeriod = require('../lib/formatPeriod')


router.get('/', async(req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const invoices = await serviceInvoices.getInvoices(page, limit);
    res.send({page: page, limit: limit, data: invoices.data, totalResults: invoices.totalRows})    
});

router.post('/', async(req,res) => {
    console.log(req.body)
    const affectedRows =  await serviceInvoices.insertInvoices(req.body);
    res.status(201).send('invoice created successfully')
})


router.get('/:id', async (req, res) => {
    const invoiceId = req.params.id;
    const [invoice] = await db.query("SELECT * FROM invoices WHERE id = ?", invoiceId)
    console.log(invoice)

    
    try {
        const apartment = await service.getAparmentById(invoice[0].apartment_id)
        const iva = await serviceOptions.getOption('iva');
        const energyPrice = await serviceOptions.getOption('energy_price');
        const fixedCharge = await serviceOptions.getOption('fixed_charge');
        const doc = await generatePDF(apartment,iva,energyPrice,fixedCharge,invoice[0].energy, invoice[0].start_date, invoice[0].end_date, invoice[0].id); 

        const filename = `ENERGÍA A CUENTA DE CONDÓMINIO - ${apartment.record[0].apartment_number} - ${formatPeriod(invoice[0].start_date)}.pdf`;
        console.log(apartment)

        const stream = res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-disposition': `attachment;filename=${filename}`
        });

        doc.on('data', (data) => { stream.write(data) });
        doc.on('end', () => { stream.end() });

        doc.end();
    } catch (error) {
        // Manejo de errores si la promesa se rechaza
        console.error('Error al generar el PDF:', error);
        res.status(500).send('Error interno al generar el PDF');
    }
});

module.exports = router;