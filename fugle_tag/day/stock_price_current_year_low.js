var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");

var default_data_value = {  min : Number.MAX_VALUE , date : new Date(0) };
var default_tag = {
    date : new Date(0),
    type : "stock_price_current_year_high_low",
    tag_value : { tag : false },
    data_value : default_data_value
};

if(require.main === module){
    var stock = "2330";
    var type = "FCNT000002";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var res = default_tag;
        container.rawContent.day.forEach(function(content){
            res = stock_price_current_year_low(content, res, undefined);
            console.log(res);
        });
    });
}

var stock_price_current_year_low = function( content, previousTag, option ){
    var pre_data_value = previousTag.data_value;
    if(moment(pre_data_value.date).year() !== moment(content.date).year()){
        pre_data_value = default_data_value;
    }

    var tag_value = {
        tag : false
    };
    var current_data_value = {
        date : moment(content.date).toDate(),
        min : pre_data_value.min
    };

    if(content.close < pre_data_value.min){
        tag_value.tag = true;
        current_data_value.min = content.close;
    }

    return {
        date : moment(content.date).toDate(),
        type : "stock_price_current_year_high_low",
        tag_value : tag_value,
        data_value : current_data_value
    };
};


module.exports = {
    judge : stock_price_current_year_low,
    default_tag,
    default_data_value
};
