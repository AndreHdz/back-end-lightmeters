/* const PDFDocument = require('pdfkit')

module.exports.getInvoice = async () => {
    const doc = new PDFDocument({bufferPages : true});
    const filename = `Factura ${Date.now()}.pdf`

    const stream = res.writeHead(200, {
        'Content-Type' : 'application/pdf',
        'Content-disposition' : `attachment;filename=${filename}`
    });

    doc.on('data', (data) => {stream.write(data)})
    doc.on('end', () => {stream.end()})

    doc.text("Hello World");
    doc.end();
} */