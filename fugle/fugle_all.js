var Promise = require('bluebird');
var moment = require('moment');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var historyVolatility = require('./history_volatility').history_volatility;
var getCost = require('./function').getCost;
var returnRate = require('./function').returnRate;

function all() { // 台灣50權值股
    fs.readFileAsync('C:/Users/USER/Desktop/Fugle/all.json').then((stock) => {
        var output = [];
        var arr = JSON.parse(stock.toString());
        arr.forEach((company) => {
            var num = company.symbol_id;
            var name = company.name;
            var url = `https://api.fugle.tw/v1/data/content/FCNT000002-${num}`;

            request(url).then((data) => {
                var single = {};
                var container = JSON.parse(data.toString());
                var day = container.rawContent.day;
                var param = {
                    range: 12,  // 在過去12個月，預設基期為年底
                    // period: 1,  // 範圍必須不超過range，每一個月/每兩個月/每三個月
                    // buyDay: 5,  // 範圍是1~31，的 5/15/25日
                    amount: 1000,  // 每次購買股數1 or 2
                    limit : 0,
                    //範圍是-0.1~0.1，用最新收盤價+0/1/3/5%購買股票的報酬率，漲停為LU，跌停為LD
                };
                var startDate = moment(day[day.length - 1].date).add(-1 * (param.range), 'M').toDate();
                var latestPrice = day[day.length - 1].close;
                var details = [];
                var periodArr = [1, 2, 3];
                var buyDayArr = [5, 15, 25];
                day = day.filter(d => new Date(d.date) >= startDate);
                buyDayArr.forEach((buyDay) => {
                    periodArr.forEach((period) => {
                        var costObj = getCost(day, param.range, period, buyDay, param.amount, param.limit);
                        var costArr = costObj.bag;
                        var value = latestPrice * (costObj.success) * param.amount;
                        var returnObj = returnRate(costArr, value, num + ':TT', costObj.success, param.limit);
                        returnObj.buyDay = buyDay;
                        returnObj.period = period;
                        console.log(costArr);
                        details.push(returnObj);
                    });
                });
                single.stock = num + ':TT';
                single.name = name;
                // single.cost = costArr;
                single.historyVolatility = historyVolatility(day, 'year');
                single.holdingReturn = (day[day.length - 1].close / day[0].close) - 1;
                single.details = details;
                console.log(single);
                output.push(single);
                fs.writeFileSync('all_period_buyday_1.json', JSON.stringify(output, null, 4));
            });
        });
    });
}

all();
