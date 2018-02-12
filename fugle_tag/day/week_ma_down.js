var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");
var _ = require("lodash");

var default_data_value = { 
    ma5 : 77.04, 
    close : 76.4, 
    date : new Date(0) 
};
var default_tag = {
    date : new Date(0),
    type : "week_ma_down",
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
    //     container.rawContent.day.forEach(function(content){
    //         res = week_ma_down(content, res, undefined);
    //         console.log(res);
    //     });
    // });
}


var week_ma_down = function( content, previousTag, option ){
    var pre_data_value = previousTag.data_value;
    // if(moment(pre_data_value.date).year() !== moment(content.date).year()){
    //     pre_data_value = default_data_value;
    // }
    // var current_data_value = {  
    //     ma20 : content.ma20,
    //     close : content.close, 
    //     date : moment(content.date).toDate()
    // };
    var current_data_value = { 
        ma5 : 77.08, 
        close : 80, 
        // date : moment(content.date).toDate()
    };

    return {
        // date : moment(content.date).toDate(),
        type : "week_ma_down",
        tag_value : judge(pre_data_value, current_data_value),
        data_value : current_data_value
    };
};
// definition
// 來源:https://tw.answers.yahoo.com/question/index?qid=20110502000016KK01706
// 來源:https://tw.answers.yahoo.com/question/index?qid=20100419000015KK08497
// 1. 今日收盤價價小於今日ma5
// 2. 今日ma5小於昨日ma5

var judge = function(pre_data_value, current_data_value){
    var tag_value = false;
    if(current_data_value.ma5 < pre_data_value.ma5 && current_data_value.close < current_data_value.ma5){
        tag_value = true;
    }
    return tag_value;
}

var res = week_ma_down( undefined, default_tag, undefined);
console.log(res);