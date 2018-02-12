var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");

var default_data_value = {
    rsi6 : 50,
    rsi12 : 50,
    up_avg6 : 0,
    up_avg12 : 0,
    down_avg6 : 0,
    down_avg12 : 0,
    date : new Date(0)
};
var default_tag = {
    date : new Date(0),
    type : "rsi_gold",
    tag_value : { tag : false },
    data_value : default_data_value
};

var rsi_gold = function(content, previousTag, option){
    var pre_data_value = previousTag.data_value;
    var current_data_value = {
        date : moment(content.date).toDate(),
        rsi6 : content.rsi6,
        rsi12 : content.rsi12,
        up_avg6 : content.up_avg6,
        up_avg12 : content.up_avg12,
        down_avg6 : content.down_avg6,
        down_avg12 : content.down_avg12
    };
    //這邊回傳值的tag_value呼叫判斷式來判斷
    return {
        date : moment(content.date).toDate(),
        type : "rsi_gold",
        tag_value : judge(pre_data_value, current_data_value),
        data_value : current_data_value
    };
};

var judge = function(pre_data_value, current_data_value){
    var tag_value = { tag : false };
    if(current_data_value.rsi6 > current_data_value.rsi12 && pre_data_value.rsi6 <= pre_data_value.rsi12){
        tag_value.tag = true;
    }
    return tag_value;
};

module.exports={
    judge : rsi_gold,
    default_tag
};


// if(require.main === module){
//     var stock = "2330";
//     var type = "FCNT000002";//近3-4年股價
//     var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
//     var request = require('request-promise');

//     request(url).then(function(data){
//         var container = JSON.parse(data.toString());
//         var content = container.rawContent.day;
//         var length = content.length;
//         var pre_data_value = {
//             rsi6 : 53.8459677489308106,
//             rsi12 : 57.3601015195837149,
//             up_avg6 : 0.8016630856995492,
//             up_avg12 : 0.9513640223137904,
//             down_avg6 : 0.6871449331988898,
//             down_avg12 : 0.7072174604769584,
//             date : "2016-10-20T16:00:00.000Z"
//         };
//         var pre_data = {
//             date : new Date(0),
//             type : "rsi_gold",
//             tag_value : { tag : false },
//             data_value : pre_data_value
//         };

//         var rsi_f = function(days){
//             if(days===6){
//                 var up_avg = pre_data_value.up_avg6;
//                 var down_avg = pre_data_value.down_avg6;
//             }
//             if(days===12){
//                 var up_avg = pre_data_value.up_avg12;
//                 var down_avg = pre_data_value.down_avg12;
//             }
//             if(content[1182].change >= 0){
//                 up_avg = (up_avg*(days-1) + content[1182].change)/days;
//                 down_avg = (down_avg*(days-1))/days;
//             }else{
//                 up_avg = (up_avg*(days-1))/days;
//                 down_avg = (down_avg*(days-1) + Math.abs(content[1182].change))/days;
//             }
//             var result = {
//                 rsi :  ( up_avg / (up_avg + down_avg))* 100,
//                 up_avg : up_avg,
//                 down_avg : down_avg
//             }
//             return result;
//         }
//         var current_data_value = {
//             date : moment(content[1182].date).toDate(),
//             rsi6 : rsi_f(6).rsi,
//             rsi12 : rsi_f(12).rsi,
//             up_avg6 : rsi_f(6).up_avg,
//             up_avg12 : rsi_f(12).up_avg,
//             down_avg6 : rsi_f(6).down_avg,
//             down_avg12 : rsi_f(12).up_avg
//         };
//         var res = rsi_gold(current_data_value, pre_data, undefined);
//         console.log(res);
//     });
// };
