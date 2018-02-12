var Promise = require('bluebird');
var request = require('request-promise');

request("https://api.fugle.tw/v1/data/company_list?market_type=tw.emg").then(function(data){
    var container = JSON.parse(data.toString());
    container.forEach(function(stock){
        var test = "node bias.js 5 " + stock.symbol_id;
        console.log(test);
    });
});