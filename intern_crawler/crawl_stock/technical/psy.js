var request = require('request-promise');

var type = 'FCNT000002'; // 近3-4年股價
var stock = process.argv[2] || '2330';
var url = `https://api.fugle.tw/v1/data/content/${type}-${stock}`;


function psy(data) {
    var psyWindows = [12, 24];
    var psyValue = {};
    var newData = Object.assign({}, data);
    psyWindows.forEach((windows) => { psyValue[windows] = 0.0; });

    data.forEach((row, index) => {
        console.log(`${row.date} + price : ${row.close}`);
        console.log(`${row.date} + change : ${row.change}`);

        psyWindows.forEach((windows) => {
            if (row.change > 0) {
                psyValue[windows] += 100 / windows;
            }
            if (index >= windows && data[index - windows].change > 0) { // 逐日改變psy的值
                psyValue[windows] -= 100 / windows;
            }
            if (index >= windows - 1) { // 將psy的值寫入每天
                const fieldName = `psy${windows}`;
                console.log(`${row.date}${fieldName} : ${row[fieldName]}`);
                newData[index][fieldName] = psyValue[windows];
            }
        });
    });
}


if (require.main === module) {
    request(url).then((data) => {
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        psy(day);
        // day.slice(1114,1140).forEach(function(d){
        //     console.log(d.date + "change : " + d.change);
        // });
    });
}
