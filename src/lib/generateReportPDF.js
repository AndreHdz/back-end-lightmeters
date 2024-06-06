const PDFDocument = require('pdfkit-construct')
const serviceApartment =require('../services/aparments.service');
const formatPeriod = require('./formatPeriod');


function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(20, y)
        .lineTo(575, y)
        .stroke();
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return year + "/" + month + "/" + day;
}

function invoiceDate(date){
    const fecha = new Date(date);
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const día = fecha.getDate().toString().padStart(2, '0');
    return fechaFormateada = `${año}-${mes}-${día}`;
}

function formatPeriodo(date) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fecha = new Date(date);
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return mes + " " + anio;
}

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

async function generatePDF(title, startDate, endDate, iva, energyPrice, fixedCharge){

    const rows = await serviceApartment.getAllApartmentsEnergy(startDate, endDate)

    let data = []
    let totalEnergy = 0
    let totalAmount = 0

    for(let i = 0; i < rows.length; i++){
        const row = rows[i]
        const amount = calculateEnergy(iva.option_value, energyPrice.option_value, fixedCharge.option_value, row.energy.total)
        data.push({ 
            service_key: row.apartmentInfo[0].service_key,
            apartment_owner :  row.apartmentInfo[0].apartment_owner,
            apartment_number: row.apartmentInfo[0].apartment_number,
            energy : row.energy.total,
            amount : formatCurrency(amount.total)
        })

        totalEnergy += row.energy.total
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
        .text("Febronio Uribe 171", 200, 50, { align: "right" })
        .font("Helvetica-Bold")
        .text("Zona Hotelera Norte, C.P 48333", 100, 65, { align: "right" })
        .font("Helvetica-Bold")
        .text("Puerto Vallarta, Jalisco, MX.", 200, 80, { align: "right" })
        .moveDown();
        //Información del Departamento
        doc
        .fillColor("#000000")
        .fontSize(12)
        .text('Reporte de energía mensual', 20, 110)
        .text(`${formatPeriod(startDate)}`, 200, 110.5, {align: "right"});

        generateHr(doc, 135);

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