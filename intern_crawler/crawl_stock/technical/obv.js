// definition:
// 如果今天的收盤價高於昨天的收盤價
// OBV = 昨天OBV + 今天的成交量
// 如果今天的收盤價低於昨日收盤價:
// OBV = 昨天OBV - 今天的成交量
// 如果今天的收盤價等於昨日收盤價
// OBV = 昨天OBV
// source:
// http://www.taindicators.com/2010/03/obv-on-balance-volume.html

var request = require('request-promise');

var type = 'FCNT000002'; // 近3-4年股價
var stock = process.argv[2] || '2330';
var url = `https://api.fugle.tw/v1/data/content/${type}${stock}`;


function obv(data) {
    var newData = Object.assign({}, data);
    let obvValue = 0;
    data.forEach((row, index) => {
        console.log(row.date);
        console.log(`change : ${row.change}`);
        console.log(`volume : ${row.volume}`);
        if (row.change > 0) obvValue += row.volume;
        if (row.change < 0) obvValue -= row.volume;
        console.log(`obv : ${obvValue}`);
        console.log('====================================');
        newData[index].obv = obvValue;
    });
}


if (require.main === module) {
    request(url).then((data) => {
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        obv(day);
    });
}
