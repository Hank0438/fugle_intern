var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");
var _ = require("lodash");


var default_data_value = { 
    change_5d : 0.085, 
    amount : 15000, 
    date : new Date(0) 
};
var default_tag = {
    date : new Date(0),
    type : "price_up_amount_down",
    tag_value : { tag : false },
    data_value : default_data_value
};

if(require.main === module){
    var request = require('request-promise');
    var stock = "2330";
    var type = "FCNT000002";//近3-4年股價
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

    // request(url).then(function(data){
    //     var container = JSON.parse(data.toString());
    //     var res = default_tag;
    //     var content = container.rawContent.day;
    //     res = price_up_amount_down(content, res, undefined);
    //     console.log(res);
    // });
}

var price_up_amount_down = function( content, previousTag, option ){
    var pre_data_value = previousTag.data_value;
    // if(moment(pre_data_value.date).year() !== moment(content.date).year()){
    //     pre_data_value = default_data_value;
    // }
    var change_5d = content[length].close - content[length-4].close;
    var current_data_value = { 
        // date : moment(content.date).toDate(),
        change_5d : 0.115,
        amount : 10000 
    };
    return {
        // date : moment(content.date).toDate(),
        type : "price_up_amount_down",
        tag_value : judge(pre_data_value, current_data_value),
        data_value : current_data_value
    };
};
// definition
// 1. 近5日漲幅大於N% (N>=10)
// 2. 今日成交量小於昨日成交量

var judge = function(pre_data_value, current_data_value){
    var tag_value = false;
    if(current_data_value.change_5d > 0.1 && current_data_value.amount < pre_data_value.amount){
        tag_value = true;
    }
    return tag_value;
}

var res = price_up_amount_down( undefined, default_tag, undefined);
console.log(res);
