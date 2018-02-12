var moment = require('moment');
var request = require('request-promise');

// var arr = [];
// request("https://api.fugle.tw/v1/data/company_list?market_type=tw.emg").then(function(data){
//     var container = JSON.parse(data.toString());
//     container.forEach(function(stock){
//         arr.push(stock.symbol_id);
//     });
// });

var type = 'FCNT000002'; // 近3-4年股價
var stock = process.argv[2] || '2330';
var url = `https://api.fugle.tw/v1/data/content/${type}-${stock}`;


// 計算MA
function calcMaIndex(data) {
    const maWindows = [5, 10, 20, 60];
    const ma = {};
    maWindows.forEach((windows) => { ma[windows] = 0.0; });
    const returnData = Object.assign({}, data);

    data.forEach((row, index) => {
    //    console.log(row.date + "price : "+row.close);
        maWindows.forEach((windows) => {
            ma[windows] += row.close / windows;
            if (index >= windows) { // 逐日改變MA的值
                ma[windows] -= data[index - windows].close / windows;
            }
            if (index >= windows - 1) { // 將MA的值寫入每天
                const fieldName = `ma${windows}`;
                // row[fieldName] = ma[windows];
                returnData[index][fieldName] = ma[windows];
                // console.log(row.date + field_name + " : " + row[field_name]);
            }
        });
    });
    return returnData;
}


// definition：
// 乖離率(%) = ( 目前股價 - 平均股價 ) / 平均股價
// source：
// http://www.cmoney.tw/notes/note-detail.aspx?nid=16060

function bias(data) {
    var maWindows = [5, 10, 20, 60];
    const returnData = Object.assign({}, data);
    data.forEach((row, index) => {
        maWindows.forEach((windows) => {
            if (index >= windows - 1) {
                const ma = `ma${windows}`;
                const fieldName = `bias${windows}`;
                // row[fieldName] = (row.close - row[ma]) / row[ma];
                returnData[index][fieldName] = (row.close - row[ma]) / row[ma];
            }
        });
    });
    return returnData;
}

if (require.main === module) {
    request(url).then((data) => {
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        calcMaIndex(day); // 每天都有ma5,10,20,60
        bias(day); // 每天都有bias5,10,20,60
        const maWindows = [5, 10, 20, 60];
        let sample = day.slice(0, 20);

        sample = sample.concat(day.slice(-10));
        sample.forEach((content) => {
            maWindows.forEach((windows) => {
                if (day.length < parseInt(windows, 10)) {
                    console.log(`The trading day ${day.length} is less than ma ${windows}.`);
                }
                const fieldName = `bias${windows}`;
                console.log(`${moment(content.date).toDate()} $${fieldName} : ${content[fieldName]}`);
            });
            console.log('=======================================');
        });
    });
}
