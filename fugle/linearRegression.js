var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var stats = require('simple-statistics');

// input: tw50權值股、0050、大盤
// output； 生出迴歸直線方程式後，找直線上方的標的
// (帶入波動率會得到估計的報酬，只要大於估計報酬就印出)
// y是定期定額投資報酬(用前一日收盤價 += 0%)
// x是波動率

fs.readFileAsync('C:/Users/USER/Desktop/Fugle/all_period_buyday_1.json').then((stock) => {
    // 先畫回歸線
    var arr = JSON.parse(stock.toString());
    var y9999 = arr.filter(y => y.stock === 'Y9999:TT');

    // arr.forEach((comp) => {
    //     var num = comp.stock;
    //     var name = comp.name;
    //     if (comp.details[0].return_rate >= y9999[0].details[0].return_rate) console.log(num + name);
    // });
    // console.log(y9999[0]);
    var result = [];
    var answer = [];
    for (var j = 0; j <= 8; j += 1) {
        var resArr = [];
        var resObj = {};
        resObj.buyDay = arr[0].details[j].buyDay;
        resObj.period = arr[0].details[j].period;
        // console.log(resObj.buyDay + '-' + resObj.period);
        arr.forEach((d) => {
            if (d.details[j].return_rate >= y9999[0].details[j].return_rate) {
                d.details[j].name = d.name;
                d.details[j].historyVolatility = d.historyVolatility;
                d.details[j].holdingReturn = d.holdingReturn;
                resArr.push(d.details[j]);
                // console.log(d.stock + d.name);
            }
        });
        resObj.details = resArr;
        result.push(resObj);
    }

    result.forEach((res) => {
        var hvrr = [];
        var historyVolatilityArr = [];
        var bag = [];
        var detailsArr = [];
        var ansObj = {};
        console.log(res.buyDay);
        console.log(res.period);
        (res.details).forEach((element) => {
            hvrr.push([element.historyVolatility, element.return_rate]);
        });
        var l = stats.linearRegressionLine(stats.linearRegression(hvrr));
        (res.details).forEach((company) => {
            if (company.return_rate >= l(company.historyVolatility)) {
                bag.push(company);
            }
        });

        bag.sort((a, b) => a.historyVolatility - b.historyVolatility);
        bag.forEach(b => historyVolatilityArr.push(b.historyVolatility));

        const intervalArr = stats.equalIntervalBreaks(historyVolatilityArr, 4);
        const quantileArr = [stats.quantile(historyVolatilityArr, 0.3), stats.quantile(historyVolatilityArr, 0.7)];
        // console.log(intervalArr);
        // console.log(quantileArr);

        // ansObj.buyDay = res.buyDay;
        // ansObj.period = res.period;
        bag.forEach((b) => {
            if (b.historyVolatility < intervalArr[1]) {
                b.intervalType = 'iL';
            } else if (b.historyVolatility >= intervalArr[1] && b.historyVolatility < intervalArr[3]) {
                b.intervalType = 'iM';
            } else if (b.historyVolatility >= intervalArr[4]) {
                b.intervalType = 'iH';
            }

            if (b.historyVolatility < quantileArr[0]) {
                b.quantileType = 'qL';
            } else if (b.historyVolatility >= quantileArr[0] && b.historyVolatility < quantileArr[1]) {
                b.quantileType = 'qM';
            } else if (b.historyVolatility >= quantileArr[1]) {
                b.quantileType = 'qH';
            }
            answer.push(b);
        });
    });
    // console.log(answer);
    //因為utf8無法在csv中被編輯，所以還是要透過別的工具轉換成csv
    fs.writeFileSync('LinearReg.json', JSON.stringify(answer, null, 4));
});

