const PDFDocument = require('pdfkit-construct')
const serviceApartment =require('../services/aparments.service');
const formatDateInvoice = require('./formatDateInvoices')
const db = require('../db2')

function formatCurrency(cents) {
    return "$" + (cents / 1).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function calculateEnergy(iva,energyPrice,fixedCharge,energy){

    if(!energy){
        return {energyPrice : 0,
            subtotal : 0,
            iva : 0,
            total : 0}
    }

    const ivaNumber =  parseInt(iva);
    const energyPriceNumber = parseFloat(energyPrice);
    const fixedChargeNumber = parseFloat(fixedCharge);
    const energyTotal = energyPriceNumber * energy;
    const subtotal =  energyTotal + fixedChargeNumber;
    const ivaPrice = (ivaNumber * 0.01) * subtotal;
    const total = subtotal + ivaPrice;
    return {
        energyPrice : energyTotal,
        subtotal : subtotal,
        iva : ivaPrice,
        total : total
    }
}

async function generatePDF(title, startDate, endDate, iva, energyPrice, fixedCharge,reportId){
    //ESTA FILA ROMPE EL CODIGO
    const [rows] = await db.query(`SELECT invoices.energy, apartments.apartment_owner, apartments.apartment_number, apartments.service_key FROM invoices INNER JOIN apartments ON invoices.apartment_id = apartments.id WHERE report_id = ? ORDER BY CAST(SUBSTRING_INDEX(apartments.apartment_number, '-', 1) AS UNSIGNED) ASC, apartments.apartment_number ASC;`, reportId)
    console.log(rows);
    let data = []
    let totalEnergy = 0
    let totalAmount = 0

    for(let i = 0; i < rows.length; i++){
        const row = rows[i]
        const amount = calculateEnergy(iva.option_value, energyPrice.option_value, fixedCharge.option_value, row.energy)
        data.push({ 
            service_key: row.service_key,
            apartment_owner :  row.apartment_owner,
            apartment_number: row.apartment_number,
            energy : row.energy,
            amount : formatCurrency(amount.total)
        })
        totalEnergy += row.energy
        totalAmount += amount.total
    }

    const totals = [{
        total_energy: parseFloat(totalEnergy).toFixed(2),
        total_amount: formatCurrency(totalAmount)
    }]


    const doc = new PDFDocument({ bufferPages: true, size: "A4", margin: 20 });

    doc.setDocumentHeader({height: '10%'}, () => {
        doc
        .image(__dirname + '/../img/harbor-logo-azul.jpg', 20, 20, { width: 90 })
        .fillColor("#000000")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Condominio Harbor 171", 200, 35, { align: "right" })
        .font("Helvetica-Bold")
        .text(`${title}`, 200, 50, { align: "right" })
        .font("Helvetica-Bold")
        .text(`Periodo ${formatDateInvoice(startDate)} - ${formatDateInvoice(endDate)}`, 100, 65, { align: "right" })
        .moveDown();
    })


    doc.addTable(
        [
            {key: 'service_key', label: 'Servicio N.', align: 'left'},
            {key: 'apartment_number', label: 'N. Departamento', align: 'left'},
            {key: 'apartment_owner', label: 'Dueño', align: 'left'},
            {key: 'energy', label: 'Energía', align: 'left'},
            {key: 'amount', label: 'Monto', align: 'left'}
        ],
        data, {
            border: null,
            width: "fill_body",
            striped: true,
            stripedColors: ["#f6f6f6", "#ededed"],
            cellsPadding: 5,
            headAlign: 'left'
        });

    doc.addTable(
        [
            {key : 'total_energy', label: 'Energia Total', align: 'left'},
            {key : 'total_amount', label: 'Costo Total', align: 'left'}
        ], totals , {
            border: null,
            marginTop: 20,
            width: "auto",
            cellsAlign: "right",
            striped: true,
            stripedColors: ["#f6f6f6", "#d6c4dd"],
            cellsPadding: 5,
            headAlign: 'left'
        });

    // render tables
    doc.render();

    return doc
}

module.exports = generatePDF