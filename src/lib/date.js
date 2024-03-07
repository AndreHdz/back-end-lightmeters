function getFormattedDate () {
    const today = new Date();
    //today.setHours(0, 0, 0, 0); // Establece las horas a las 00:00:00
    const formattedDate = today.toISOString().split('T')[0];
    return formattedDate;
}

module.exports = getFormattedDate;