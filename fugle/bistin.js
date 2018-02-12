var request = require('request-promise');
var moment = require('moment');
var getCost = require('./function').getCost;
var returnRate = require('./function').returnRate;

function calcTrailResult(stock, priceData, len, every, day, volume, tolerance) {
    var costObj = getCost(priceData, len, every, day, volume * 1000, tolerance);
    var costArr = costObj.bag;
    var latestPrice = priceData[priceData.length - 1].close;
    var value = latestPrice * (costObj.success) * volume * 1000;
    var returnArr = returnRate(costArr, value, stock, costObj.success, tolerance);
    console.log(returnArr);
    return costArr;
}

function calcDayReturn(priceData, order) {
    var targetIdx = order.length - 1;
    var currentAmount = 0;
    var currentCost = 0;
    var dayReturn = [];
    priceData.forEach((row) => {
        var price = row.close;
        var day = moment(row.date).format('YYYY-MM-DD');
        var rate = 0;
        var obj = {};
        if (targetIdx >= 0 && day === order[targetIdx].date) {
            currentCost += order[targetIdx].cost;
            currentAmount += order[targetIdx].amount;
            // console.log("date : "+day);
            // console.log("currentCost : "+currentCost);
            targetIdx -= 1;
        }
        rate = Math.round((((price * currentAmount) / currentCost) - 1) * 10000) / 10000;
        if (rate === Infinity) rate = 0;
        // console.log(rate);
        obj.date = day;
        obj.rate = rate;
        dayReturn.push(obj);
    });
    dayReturn = dayReturn.filter(d => !isNaN(d.rate) && d.rate !== 0);
    return dayReturn;
}

function singleStock(stock) {
    var url = `https://api.fugle.tw/v1/data/content/FCNT000002-${stock}`;

    request(url).then((data) => {
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        // 先把資料剪成12個月前到現在;
        var startDate = moment().add(-1 * (12), 'M').toDate(); // range = 12
        var beginIndex = day.indexOf(day.find(d => new Date(d.date) >= startDate));
        var aYear = day.filter(d => new Date(d.date) >= startDate);
        if (beginIndex !== 0) aYear = day.slice(beginIndex - 1);
        var costArr = calcTrailResult(stock, aYear, 12, 3, 30, 1, 0);
        var dayReturn = calcDayReturn(aYear, costArr);

        // console.log(beginIndex);
        // aYear.forEach(d => console.log(d.date));
        console.log(costArr);
        console.log(dayReturn);
    });
}


if (process.argv[2]) {
    singleStock(process.argv[2]);
}
