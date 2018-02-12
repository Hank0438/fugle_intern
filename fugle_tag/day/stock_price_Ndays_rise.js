var Promise = require('bluebird');
var moment = require("moment");

var default_data_value = { change_rate: 0 };
var default_tag = {
    date : new Date(0),
    type : "stock_price_Ndays_rise",
    tag_value : { N: 0 },
    data_value : default_data_value
};

// 連N日大漲(N≧3，且每日漲幅超過3%)
var stock_price_Ndays_rise = function(content, previousTag, option){
    var current_date = new Date(content.date);
    var current_tag_value = previousTag.tag_value;
    var current_data_value = default_data_value;
    current_data_value.change_rate = content.change_rate;
    if(content.change_rate >= 3){
        current_tag_value.N += 1;
    } else {
        current_tag_value.N = 0;
    }

    return {
        date : current_date,
        type : "stock_price_Ndays_rise",
        tag_value : current_tag_value,
        data_value : current_data_value
    };
};


if(require.main === module){
    var stock = "5283";
    var type = "FCNT000002";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var res = default_tag;
        container.rawContent.day.forEach(function(content){
            res = stock_price_Ndays_rise(content, res, undefined);
            console.log(res);
        });
    });
}


module.exports = {
    judge : stock_price_Ndays_rise,
    default_tag,
    default_data_value
};
