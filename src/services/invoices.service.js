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
const JSZip = require('jszip');
const getFormattedDateInvoices = require('../lib/formatDateInvoices');
const generatePDF = require('../lib/generatePDF')



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
    
    const formattedRows = rows.map(row => ({
        ...row,
        formattedStartDate: getFormattedDateInvoices(row.start_date),
        formattedEndDate : getFormattedDateInvoices(row.end_date)
    }))

    const totalCount = countQuery[0].total;
    return {data: formattedRows, totalRows: totalCount};
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
    const formmatedRecords = records.map(record => (
        {
        ...record,
        formattedStartDate : getFormattedDateInvoices(record.startDate),
        formattedEndDate : getFormattedDateInvoices(record.endDate)
    }))
    return formmatedRecords
}

module.exports.generateInvoicePDF = async () => {
    
}


module.exports.generateReportZip = async (reportId) => {
    try {
        const zip = new JSZip();

        // Realiza la consulta para obtener los datos necesarios
        const [PDFs] = await db.query(
            'SELECT invoices.energy, invoices.start_date, invoices.end_date, apartments.apartment_owner, apartments.apartment_number, apartments.service_key, invoices.id ' +
            'FROM invoices ' +
            'INNER JOIN apartments ON invoices.apartment_id = apartments.id ' +
            'WHERE report_id = ? ',
            [reportId]
        );

        console.log('Datos obtenidos de la base de datos:', PDFs);

        // Genera los PDFs de manera asíncrona y los agrega al archivo ZIP
        const pdfPromises = PDFs.map(async (pdfData) => {
            const apartment = {
                apartment_number: pdfData.apartment_number,
                apartment_owner: pdfData.apartment_owner,
                service_key: pdfData.service_key,
            };
            console.log('Generando PDF para:', apartment);

            const doc = await generatePDF(apartment, pdfData.energy, pdfData.start_date, pdfData.end_date, pdfData.id);

            return new Promise((resolve, reject) => {
                const buffers = [];
                doc.on('data', (data) => buffers.push(data));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    const fileName = `${pdfData.apartment_number}-${pdfData.apartment_owner}.pdf`;
                    zip.file(fileName, pdfBuffer);
                    console.log(`Archivo ${fileName} agregado al ZIP`);
                    resolve();
                });
                doc.on('error', (err) => reject(err));

                // Finaliza el documento PDF
                doc.end();
            });
        });

        // Espera a que todas las promesas se resuelvan
        await Promise.all(pdfPromises);
        console.log('Todos los PDFs se han generado y agregado al ZIP');

        const content = await zip.generateAsync({ type: 'nodebuffer' });

        return content;
    } catch (error) {
        console.error('Error generando el archivo ZIP:', error);
        throw error;
    }
};