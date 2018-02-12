var Promise = require('bluebird');
var moment = require("moment");

var default_data_value = { month_amount_avg : 1000 };
var default_tag = {
    date : new Date(0),
    type : "price_up_amount_up",
    tag_value : { N: 0 },
    data_value : default_data_value
};

// 當日上漲大於5%，且當日成交量大於月均量
var price_up_amount_up = function(content, previousTag, option){
    var today = content.length - 1;
    
    var month_amount = 0;
    content.slice(-22).forEach(function(c){
        console.log(c.date +" : "+ c.amount);
        month_amount += c.amount;
    })
    var month_amount_avg = month_amount/22;

    var current_date = moment(content[today].date).toDate();
    var current_tag_value = previousTag.tag_value;
    var current_data_value = default_data_value;
    current_data_value.month_amount_avg = month_amount_avg;

    if(content[today].change_rate >= 5 && content[today].amount > month_amount_avg){
        current_tag_value.N += 1;
    } else {
        current_tag_value.N = 0;
    }
    return {
        date : current_date,
        type : "price_up_amount_up",
        tag_value : current_tag_value,
        data_value : current_data_value
    };
};


if(require.main === module){
    var stock = "2330";
    var type = "FCNT000002";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var content = container.rawContent.day;
        var res = default_tag;    
        res = price_up_amount_up(content, res, undefined);
        console.log(res);
    });
}


module.exports = {
    judge : price_up_amount_up,
    default_tag,
    default_data_value
};
