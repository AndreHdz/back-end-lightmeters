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

module.exports.getInvoices = async (query, year, month, page, limit) => {
    const offset = (page - 1) * limit;
    const searchQuery =  `%${query}%`;

    let where = 'WHERE 1 = 1'
    const queryParams = []

    if(query){
        where += ' AND (apartments.apartment_owner LIKE ? OR apartments.apartment_number LIKE ?)'
        queryParams.push(searchQuery, searchQuery)
    }

    if(year && month){
        where += ' AND (YEAR(invoices.start_date) = ? AND MONTH(invoices.start_date) = ?)'
        queryParams.push(year, month)
    } else if (month){
        where += ' AND (MONTH(invoices.start_date) = ?)'
        queryParams.push(month)
    } else if (year){
        where += ' AND (YEAR(invoices.start_date) = ?)'
        queryParams.push(year)
    }

    queryParams.push(limit, offset)

    const [rows] = await db.query(`
        SELECT invoices.*, apartments.apartment_owner, apartments.apartment_number, apartments.service_key FROM invoices 
        LEFT JOIN apartments ON invoices.apartment_id = apartments.id 
        ${where}
        ORDER BY invoices.id DESC LIMIT ? OFFSET ?;`
        , queryParams)

    const countParams = queryParams.slice(0,-2);

    const [countQuery] = await db.query(`
        SELECT COUNT(*) AS total 
        FROM invoices 
        LEFT JOIN apartments ON invoices.apartment_id = apartments.id 
         ${where}`
         , countParams);

    const totalCount = countQuery[0].total;
    return {data: rows, totalRows: totalCount};
}

module.exports.insertInvoices = async (data) => {
    const [{affectedRows}] = await db.query('INSERT INTO invoices (apartment_id, energy, start_date, end_date) VALUES (?,?,?,?)',[data.apartment_id, data.energy, data.start_date, data.end_date])
    return affectedRows;
}

module.exports.insertReport = async (title, startDate, endDate) => {
    const [rows] = await db.query('INSERT INTO reports (title, startDate, endDate) VALUES (?,?,?)',[title,startDate,endDate])
    return rows
}

module.exports.getReports = async () => {
    const [records] = await db.query('SELECT * FROM reports')
    return records
}