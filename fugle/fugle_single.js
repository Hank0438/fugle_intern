var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var moment = require("moment");
var request = require('request-promise');
var _ = require("lodash");
var stats = require("stats-lite");
var history_volatility = require("./history_volatility").history_volatility;
var getCost = require("./function").getCost;
var returnRate = require("./function").returnRate;

if(process.argv[2]){
    singleStock(process.argv[2]);
}

//2325 2308
//單一股票
function singleStock(stock){
    var url = "https://api.fugle.tw/v1/data/content/FCNT000002-" + stock;
    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        var param = {
            range : 12,  //在過去12個月，預設基期為年底
            period : 1,  //範圍必須不超過range，每一個月/每兩個月/每三個月
            buyDday : 5,  //範圍是1~31，的 5/15/25日
            amount : 1000,  //每次購買股數1 or 2
            //範圍是-0.1~0.1，用最新收盤價+0/1/3/5%購買股票的報酬率，漲停為LU，跌停為LD
        }
        var startDate = moment(day[day.length - 1].date).add(-1 * (param.range), 'M').toDate();
        day = day.filter(d => new Date(d.date) >= startDate);
        var latest_price = day[day.length-1].close;  
        var details = [];
        var limitArr = [0, 0.01, 0.03, 0.05, 0.07];
        limitArr.forEach(function(limit){
            var costObj = getCost(day, param.range, param.period, param.buyDay, param.amount, limit);
            var costArr = costObj.bag;
            var value = latest_price*(costObj.success)*param.amount;
            var return_rate = returnRate(costArr, value, stock, costObj.success, limit);
            console.log(costArr);
            details.push(return_rate);
        });

        var single = {
            stock : stock,
            history_volatility : history_volatility(day,"year"),
            details : details,
        };
        console.log(single);
    });
}