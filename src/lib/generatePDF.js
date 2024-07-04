const PDFDocument = require('pdfkit')
const formatPeriod = require('./formatPeriod');
const db = require('../db2')

function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(20, y)
        .lineTo(395, y)
        .stroke();
}

function invoiceDate(date){
    const invoiceDate = new Date(date);
    const year = invoiceDate.getFullYear();
    const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0');
    const day = invoiceDate.getDate().toString().padStart(2, '0');
    return `${day}-${month}-${year}`;
}

function formatCurrency(cents) {
    return "$" + (cents / 1).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function generateTableRow(
    doc,
    y,
    description,
    amount,
) {
    doc
        .fontSize(10)
        .text(description, 20, y)
        .text(amount, 300, y, { width: 90, align: "right" })
}

function calculateEnergy(iva,energyPrice,fixedCharge,energy){
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




async function generatePDF(apartment, energy, startDate, endDate, id){
    const doc = new PDFDocument({ bufferPages: true, size: "A5", margin: 20 });

    const [iva] = await db.query('SELECT * FROM options WHERE option_name = "iva"',)
    const [energyPrice] = await db.query('SELECT * FROM options WHERE option_name = "energy_price"',)
    const [fixedCharge] = await db.query('SELECT * FROM options WHERE option_name = "fixed_charge"',)

    let res = calculateEnergy(iva[0].option_value, energyPrice[0].option_value, fixedCharge[0].option_value, energy);
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
        .fontSize(14)
        .text("Consumo de energía", 20, 110)
        .fontSize(13)
        .text(`${formatPeriod(startDate)}`, 250, 110.5);

    generateHr(doc, 135);

    const customerInformationTop = 150;

    const today = new Date()

    doc
        .fontSize(10)
        .text(`Recibo #${id}`, 20, customerInformationTop)
        .font("Helvetica-Bold")
        .font("Helvetica")
        .text(`Fecha: ${invoiceDate(today)}`, 20, customerInformationTop + 15)
        .font("Helvetica")
        .text(`Periodo: ${invoiceDate(startDate)} - ${invoiceDate(endDate)}`, 20, customerInformationTop + 30)
        .text(`Energía consumida: ${energy} kw`, 20, customerInformationTop + 45)
        .font("Helvetica-Bold")
        .text(apartment.apartment_owner, 250, customerInformationTop)
        .font("Helvetica")
        .text(`Departamento ${apartment.apartment_number}`, 250, customerInformationTop + 30)
        .text(`Servicio: ${apartment.service_key}`,
            250,
            customerInformationTop + 45
        )
        .moveDown();

    generateHr(doc, 217);

    doc.text("Fecha límite de pago día 10", 20, customerInformationTop + 80)

    //Cargos
    let i;
    const invoiceTableTop = 290;

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Descripción",
        "Importe(MXN)",
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");




    const invoice = {
        items : [
            {
                description: "Cargo por energía",
                amount : res.energyPrice
            },
            {
                description: "Cargo Fijo",
                amount : fixedCharge[0].option_value
            },
            {
                description: `IVA ${iva[0].option_value}%`,
                amount : res.iva
            }
        ]
    }


    for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.description,
            formatCurrency(item.amount)
        );

        generateHr(doc, position + 20);
    }

    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      subtotalPosition,
      "",
      `Total: ${formatCurrency(res.total)}`,
      formatCurrency(invoice.subtotal)
    );


    return doc
}

module.exports = generatePDF