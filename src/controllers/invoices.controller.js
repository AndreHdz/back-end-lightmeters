const express = require('express');
const router = express.Router();
const generateReportPDF = require('../lib/generateReportPDF')
const generatePDF = require('../lib/generatePDF')
const serviceInvoices = require('../services/invoices.service')
const service = require('../services/aparments.service');
const serviceOptions = require('../services/options.service')
const db = require('../db2')
const formatPeriod = require('../lib/formatPeriod')

router.get('/', async(req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.q;
    const year = req.query.year;
    const month = req.query.month
    const invoices = await serviceInvoices.getInvoices(query, year, month, page, limit);
    res.send({page: page, limit: limit, data: invoices.data, totalResults: invoices.totalRows})    
});

router.post('/', async(req,res) => {
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

        const filename = `${apartment.record[0].apartment_number} - ${apartment.record[0].apartment_owner} - ${formatPeriod(invoice[0].start_date)}.pdf`;
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

router.post('/report', async(req,res) => {

    const {title, startDate, endDate} = req.body;
    if(!title || !startDate || !endDate){
        res.status(400).send({message: 'Se necesitan title, startDate y endDate'})
    }
    const rows = await serviceInvoices.insertReport(title,startDate, endDate)
    res.status(201).send({message: 'Reporte creado'})
})

router.get('/report/:id', async( req, res) => {
    const reportId = req.params.id;
    const [report] = await db.query("SELECT * FROM reports WHERE id = ?", reportId)

    const {title, startDate, endDate} = report[0];

    try {
        const iva = await serviceOptions.getOption('iva');
        const energyPrice = await serviceOptions.getOption('energy_price');
        const fixedCharge = await serviceOptions.getOption('fixed_charge');

        const doc = await generateReportPDF(title, startDate, endDate, iva, energyPrice, fixedCharge); 

        const filename = `${title}.pdf`;

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
})

module.exports = router;