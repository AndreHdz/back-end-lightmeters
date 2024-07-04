function getFormattedDateInvoices (date) {
    const today = new Date(date);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Se agrega 1 porque los meses van de 0 a 11
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${day}-${month}-${year}`;
    return formattedDate
}

module.exports = getFormattedDateInvoices;