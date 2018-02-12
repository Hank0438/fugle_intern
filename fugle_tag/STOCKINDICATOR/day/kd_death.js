var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");
var _ = require("lodash");


var default_data_value = {
    k9 : 50,
    d9 : 50,
    date : new Date(0)
};
var default_tag = {
    date : new Date(0),
    type : "kd_death",
    tag_value : { tag : false },
    data_value : default_data_value
};


var kd_death = function(content, previousTag, option){
    var pre_data_value = previousTag.data_value;
    var current_data_value = {
        date : moment(content.date).toDate(),
        k9 : content.k9,
        d9 : content.d9
    };

    //這邊回傳值的tag_value呼叫判斷式來判斷
    return {
        date : moment(content.date).toDate(),
        type : "kd_death",
        tag_value : judge(pre_data_value, current_data_value),
        data_value : current_data_value
    };
};

var judge = function(pre_data_value, current_data_value){
    var tag_value = { tag : false};
    if(current_data_value.k9 < current_data_value.d9 && pre_data_value.k9 >= pre_data_value.d9){
        tag_value.tag = true;
    }
    return tag_value;
};

module.exports={
    judge : kd_death,
    default_tag
};


// if(require.main === module){
//     var request = require('request-promise');
//     var stock = "2330";
//     var type = "FCNT000002";//近3-4年股價
//     var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

//     var start_date = moment(new Date(2015,8,25)).add(-8, "d").toDate();

//     request(url).then(function(data){
//         var container = JSON.parse(data.toString());
//         var content = container.rawContent.day;

//         var kd_content = content.filter(function(row){
//             return new Date(row.date) >= start_date;
//         });

//         var pre_data_value = { k9 : 0.49, d9 : 0.22, date : new Date(0) };

//         var length = kd_content.length;
//         for(var i = 8; i < length; i++) {
//             var today = kd_content[i];
//             var tmp = kd_content.slice(i-8,i+1);
//             var low_9days =  (_.minBy(tmp, "low")).low;
//             var high_9days = (_.maxBy(tmp, "high")).high;

//             var rsv_today = ( (today.close - low_9days) / ( high_9days - low_9days ) )*100;
//             if(today.close === low_9days || high_9days === low_9days){
//                 rsv_today = 50;
//             };
//             var k9_today = pre_data_value.k9*( 2/3 ) + rsv_today*( 1/3 );
//             var d9_today = pre_data_value.d9*( 2/3 ) + k9_today*( 1/3 );

//             pre_data_value.k9 = k9_today;
//             pre_data_value.d9 = d9_today;
//             kd_content[i].k9 = k9_today;
//             kd_content[i].d9 = d9_today;
//         }

//         var res = default_tag;

//         kd_content.slice(8).forEach(function(content){
//             res = kd_death(content, res, undefined);
//             console.log(res);
//         });
//     });
// };
