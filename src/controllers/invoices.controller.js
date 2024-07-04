const express = require('express');
const router = express.Router();
const db = require('../db2')
const generateReportPDF = require('../lib/generateReportPDF')
const generatePDF = require('../lib/generatePDF')
const formatPeriod = require('../lib/formatPeriod')
const serviceInvoices = require('../services/invoices.service')
const service = require('../services/aparments.service');
const serviceOptions = require('../services/options.service')

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

router.get('/report', async(req,res) => {
    const reports = await serviceInvoices.getReports();
    res.send(reports)
})

router.get('/zip/:id', async(req,res) => {
    const {id} = req.params;

    const [report] = await db.query(`SELECT * FROM reports WHERE id = ${id}`)
    console.log(report);

    try{
        const zipContent = await serviceInvoices.generateReportZip(id);
        res.set({
            'Content-Type' : 'application/zip',
            'Content-Disposition' : `attachment; filename=${formatPeriod(report[0].startDate)}`,
            'Content-Lenght' : zipContent.length
        });
        res.send(zipContent)
    } catch (err){
        console.error(err);
        res.status(500).send('Error generating the ZipFile')
    }
})

router.get('/:id', async (req, res) => {
    const invoiceId = req.params.id;
    const [invoice] = await db.query("SELECT * FROM invoices WHERE id = ?", invoiceId)
    try {
        const data = await service.getAparmentById(invoice[0].apartment_id);
        const apartment = {
            apartment_number : data.record[0].apartment_number,
            apartment_owner: data.record[0].apartment_owner,
            service_key: data.record[0].service_key,
        }
        console.log(apartment);
        
        const doc = await generatePDF(apartment,invoice[0].energy, invoice[0].start_date, invoice[0].end_date, invoice[0].id); 
        const filename = `${apartment.apartment_number} - ${apartment.apartment_owner} - ${formatPeriod(invoice[0].start_date)}.pdf`;
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
    const rows = await serviceInvoices.insertReport(title, startDate, endDate)
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

        const doc = await generateReportPDF(title, startDate, endDate, iva, energyPrice, fixedCharge, reportId); 

        const filename = `${title}.pdf`;

        const stream = res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-disposition': `attachment;filename='${filename}'`
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