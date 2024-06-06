function getYesterday(date){
    const day = new Date(date);
    day.setDate(day.getDate() - 1);
    const prevDay = day.toISOString().split('T')[0];
    return prevDay
}

module.exports = getYesterday;