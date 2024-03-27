function formatPeriod(date) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const fecha = new Date(date);
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return mes + " " + anio;
}


module.exports = formatPeriod;