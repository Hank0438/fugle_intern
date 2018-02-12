var moment = require('moment');
var request = require('request-promise');
var historyVolatility = require('./history_volatility').history_volatility;
var getCost = require('./function').getCost;
var returnRate = require('./function').returnRate;

function singleStock(stock) {
    var url = `https://api.fugle.tw/v1/data/content/FCNT000002-${stock}`;
    request(url).then((data) => {
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        var param = {
            range: 12,  // 在過去12個月，預設基期為年底
            period: 3,  // 範圍必須不超過range，每一個月/每兩個月/每三個月
            buy_day: 25,  // 範圍是1~31，的 5/15/25日
            buy_amount: 1000,  //每次購買股數1000
            // limit : 0.05,
            //範圍是-0.1~0.1，用最新收盤價+0/1/3/5%購買股票的報酬率，漲停為LU，跌停為LD
        };
        var startDate = moment(day[day.length - 1].date).add(-1 * (param.range), 'M').toDate();
        day = day.filter(d => new Date(d.date) >= startDate);
        var latestPrice = day[day.length - 1].close;
        var details = [];
        var limitArr = [0, 0.01, 0.03, 0.05, 0.07];
        limitArr.forEach((limit) => {
            var costObj = getCost(day, param.range, param.period, param.buy_day, param.buy_amount, limit);
            var costArr = costObj.bag;
            var value = latestPrice * (costObj.success) * param.buy_amount;
            var return_rate = returnRate(costArr, value, stock, costObj.success, limit);
            console.log(costArr);
            details.push(return_rate);
        });

        var single = {
            stock: stock,
            name: '大盤',
            historyVolatility: historyVolatility(day, 'year'),
            holdingReturn: (day[day.length - 1].close / day[0].close) - 1,
            details: details,
        };
        console.log(single);
    });
}

singleStock('Y9999');
