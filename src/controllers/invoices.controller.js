const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit')

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



router.get('/:id', async (req, res) => {
    console.log('holla mundo')
    const doc = new PDFDocument({ bufferPages: true, size: "A5", margin: 20 });
    const filename = `Factura ${Date.now()}.pdf`

    const stream = res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-disposition': `attachment;filename=${filename}`
    });

    doc.on('data', (data) => { stream.write(data) })
    doc.on('end', () => { stream.end() })

    //Header
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
        .text("Invoice Number:", 20, customerInformationTop)
        .font("Helvetica-Bold")
        .text("1234", 105, customerInformationTop)
        .font("Helvetica")
        .text("Invoice Date:", 20, customerInformationTop + 15)
        .text(formatDate(new Date()), 105, customerInformationTop + 15)
        .text("Balance Due:", 20, customerInformationTop + 30)
        .text(
            "80$",
            105,
            customerInformationTop + 30
        )

        .font("Helvetica-Bold")
        .text("Julian Lopez", 250, customerInformationTop)
        .font("Helvetica")
        .text("Departamento 1001", 250, customerInformationTop + 15)
        .text(
            "" +
            ", " +
            "" +
            ", " +
            "",
            250,
            customerInformationTop + 30
        )
        .moveDown();

    generateHr(doc, 220);

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
                amount : 600
            },
            {
                description: "Cargo Fijo",
                amount : 55
            },
            {
                description: "IVA 16%",
                amount : 600
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
      `Total: ${formatCurrency(524)}`,
      formatCurrency(invoice.subtotal)
    );


    doc.end();




});

module.exports = router;