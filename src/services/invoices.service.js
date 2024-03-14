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
const db = require('../db2')

module.exports.getInvoices = async (page, limit) => {
    const offset = (page - 1) * limit;
    console.log
    const [rows] = await db.query("SELECT * FROM invoices LIMIT ? OFFSET ?;", [limit, offset])
    const [countQuery] = await db.query("SELECT COUNT (*) AS total FROM invoices");
    
    const totalCount = countQuery[0].total;

    for(let i = 0; i < rows.length; i++){
        const invoice = rows[i];
        const [apartment] = await db.query("SELECT * FROM apartments WHERE id = ?", invoice.apartment_id)
        if(apartment.length > 0){
            invoice.apartment_owner = apartment[0].apartment_owner;
            invoice.apartment_number = apartment[0].apartment_number;
        } else {
            console.log(`No se econtro registro para ${invoice.id}`)
        }
    }
    return {data: rows, totalRows: totalCount}
}