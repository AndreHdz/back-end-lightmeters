const PDFDocument = require('pdfkit')
const serviceApartment =require('../services/aparments.service')


function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(20, y)
        .lineTo(395, y)
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

function formatCurrency(cents) {
    return "$" + (cents/1).toFixed(2);
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




async function generatePDF(apartment, iva, energyPrice, fixedCharge, energy, startDate, endDate, id){
    const doc = new PDFDocument({ bufferPages: true, size: "A5", margin: 20 });
    let res = calculateEnergy(iva.option_value, energyPrice.option_value, fixedCharge.option_value, energy);
    doc
        .image(__dirname + '/../img/harbor-171-logo.jpg', 20, 20, { width: 90 })
        .fillColor("#000000")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Febronio Uribe 171", 200, 35, { align: "right" })
        .font("Helvetica-Bold")
        .text("Zona Hotelera, Las Glorias", 200, 50, { align: "right" })
        .font("Helvetica-Bold")
        .text("Puerto Vallarta, Jalisco.", 200, 65, { align: "right" })
        .moveDown();

    //Información del Departamento
    doc
        .fillColor("#000000")
        .fontSize(14)
        .text("Recibo de Lúz", 20, 110);

    generateHr(doc, 135);

    const customerInformationTop = 150;

    doc
        .fontSize(10)
        .text(`Recibo #${id}`, 20, customerInformationTop)
        .font("Helvetica-Bold")
        .font("Helvetica")
        .text(`Periodo: ${invoiceDate(startDate)} - ${invoiceDate(endDate)}`, 20, customerInformationTop + 15)
        .text(`Energía consumida: ${energy} kw`, 20, customerInformationTop + 30)

        .font("Helvetica-Bold")
        .text(apartment.record[0].apartment_owner, 250, customerInformationTop)
        .font("Helvetica")
        .text(`Departamento ${apartment.record[0].apartment_number}`, 250, customerInformationTop + 15)
        .text(`Servicio: ${apartment.record[0].service_key}`,
            250,
            customerInformationTop + 30
        )
        .moveDown();

    generateHr(doc, 200);

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
                amount : fixedCharge.option_value
            },
            {
                description: `IVA ${iva.option_value}%`,
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