var Promise = require('bluebird');
var moment = require("moment");

//var default_data_value = {DLbuy: 0, DLsell: 0};
var default_tag = {
    date : new Date(0),
    type : "dl_oversold",
    tag_value : { N: 0 },
    data_value : {}
};

// 自營商連N日賣超
var dl_oversold = function(content, previousTag, option){
    var current_date = new Date(content.date);
    var current_tag_value = previousTag.tag_value;
    var current_data_value = {};
    // var current_data_value = default_data_value;
    // current_data_value.DLbuy = content.DLbuy;
    // current_data_value.DLsell = content.DLsell;

    if(content.DLbuy < content.DLsell){
        current_tag_value.N += 1;
    }
    else{
        current_tag_value.N = 0;
    }

    return {
        date : current_date,
        type : "dl_oversold",
        tag_value : current_tag_value,
        data_value : current_data_value
    };
};


if(require.main === module){
    var stock = "2330";
    var type = "FCNT000005";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var res = default_tag;
        container.rawContent.forEach(function(content){
            res = dl_oversold(content, res, undefined);
            if(res.tag_value.N > 3){
                console.log(res.date);
                console.log(res.tag_value);
                console.log(res.data_value);
            }
        });
    });
}
module.exports={
    judge : dl_oversold,
    default_tag
};
