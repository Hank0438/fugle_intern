var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");

var default_data_value = {remain: 0, yremain: 0};
var default_tag = {
    date : new Date(0),
    type : "bearish_decrease",
    tag_value : { N: 0 },
    data_value : default_data_value
};

// 融劵餘額連N日減少
var bearish_decrease = function(content, previousTag, option){
    var current_date = new Date(content.date);
    var current_tag_value = previousTag.tag_value;
    var current_data_value = default_data_value;
    current_data_value.remain = content.bearish.remain;
    current_data_value.yremain = content.bearish.yremain;

    if(content.bearish.remain < content.bearish.yremain){
        current_tag_value.N += 1;
    }else{
        current_tag_value.N = 0;
    }

    return {
        date : current_date,
        type : "bearish_decrease",
        tag_value : current_tag_value,
        data_value : current_data_value
    };
}


if(require.main === module){
    var stock = "2330";
    var type = "FCNT000003";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var res = default_tag;
        var reverse_rawContent = container.rawContent.reverse();
        reverse_rawContent.forEach(function(content){
            res = bearish_decrease(content, res, undefined);
            if(res.tag_value.N > 3){
                console.log(res.date);
                console.log(res.tag_value);
                console.log(res.data_value);
            }
        });
    });
}
