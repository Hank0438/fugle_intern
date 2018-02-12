var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");

var default_data_value = {
    ema12 : 0,
    ema26 : 0,
    macd12_26 : 0,
    date : new Date(0)
};

var default_tag = {
    date : new Date(0),
    type : "macd_gold",
    tag_value : { tag : false },
    data_value : default_data_value
};



var macd_gold = function(content, previousTag, option){
    var pre_data_value = previousTag.data_value;
    var current_data_value = {
        macd12_26 : content.macd12_26,
        ema12 : content.ema12,
        ema26 : content.ema26,
        date : moment(content.date).toDate()
    };

    return {
        date : moment(content.date).toDate(),
        type : "macd_gold",
        tag_value : judge(pre_data_value, current_data_value),
        data_value : current_data_value
    };
}

var judge = function(pre_data_value, current_data_value){
    var tag_value = { tag : false };
    var tag_pre = pre_data_value.macd12_26 >= (pre_data_value.ema12 - pre_data_value.ema26);
    var tag_current = current_data_value.macd12_26 < (current_data_value.ema12 - current_data_value.ema26);
    if(tag_pre && tag_current){
        tag_value.tag = true;
    }
    return tag_value;
}

module.exports={
    judge : macd_gold,
    default_tag
};

// if(require.main === module){
//     var request = require('request-promise');
//     var stock = "2330";
//     var type = "FCNT000002";//近3-4年股價
//     var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

//     request(url).then(function(data){
//         var container = JSON.parse(data.toString());
//         var content = container.rawContent.day;
//         var pre_data_value = {
//             ema12 : 187.6878564067976640,
//             ema26 : 185.1900980406917085,
//             macd12_26 : 2.5669334012226730,
//             date : "Fri Oct 21 2016 00:00:00 GMT+0800"
//         };
//         var pre_data = {
//             date : new Date(0),
//             type : "macd_gold",
//             tag_value : { tag : false },
//             data_value : pre_data_value
//         };

//         var length = content.length;
//         var ema12_t = (content[1182].close - pre_data_value.ema12) *(2/13) + pre_data_value.ema12;
//         var ema26_t = (content[1182].close - pre_data_value.ema26) *(2/27) + pre_data_value.ema26;
//         var dif_t = ema12_t - ema26_t;
//         var macd12_26_t = (dif_t - pre_data_value.macd12_26) *(2/10) + pre_data_value.macd12_26;
//         var current_data_value = {
//             ema12 : ema12_t,
//             ema26 : ema26_t,
//             macd12_26 : macd12_26_t,
//             date : moment(content[1182].date).toDate()
//         }
//         res = macd_gold(current_data_value, pre_data, undefined);
//         console.log(res);
//     });
// };
