var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");
var _ = require("lodash");


var default_data_value = { 
    ma5 : 75.82, 
    ma10 : 75.98, 
    ma20 : 77.04, 
    ma60 : 74.72, 
    close : 76.4, 
    date : new Date(0) 
};
var default_tag = {
    date : new Date(0),
    type : "above_all_ma",
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
    //         res = above_all_ma(content, res, undefined);
    //         console.log(res);
    //     });
    // });
}

var above_all_ma = function( content, previousTag, option ){
    var pre_data_value = previousTag.data_value;
    // if(moment(pre_data_value.date).year() !== moment(content.date).year()){
    //     pre_data_value = default_data_value;
    // }
    // var current_data_value = { 
    //     ma5 : content.ma5, 
    //     ma10 : content.ma10, 
    //     ma20 : content.ma20, 
    //     ma60 : content.ma60, 
    //     close : content.close, 
    //     date : moment(content.date).toDate()
    // };
    var current_data_value = { 
        // date : moment(content.date).toDate()
        ma5 : 76.1, 
        ma10 : 75.63, 
        ma20 : 77.08, 
        ma60 : 74.88, 
        close : 80, 
    };



    return {
        // date : moment(content.date).toDate(),
        type : "above_all_ma",
        tag_value : judge(pre_data_value, current_data_value),
        data_value : current_data_value
    };
};
// definition
// 來源:http://www.cmoney.tw/app/itemcontent.aspx?id=1415
// 1. 今日收盤價價大於周月季線
// 2. 今日漲幅大於2%
// 3. 周月季線乖離在10%以內

var judge = function(pre_data_value, current_data_value){
    var tag_value = false;
    var bull = current_data_value.ma5 > current_data_value.ma10 &&
            current_data_value.ma10 > current_data_value.ma20 &&
            current_data_value.ma20 > current_data_value.ma60;
    var bear = current_data_value.ma5 < current_data_value.ma10 &&
            current_data_value.ma10 < current_data_value.ma20 &&
            current_data_value.ma20 < current_data_value.ma60;
    var ma_tangle = !bull && !bear;
    var break_ma = current_data_value.close > current_data_value.ma5 && 
                current_data_value.close > current_data_value.ma10 &&
                current_data_value.close > current_data_value.ma20 &&
                current_data_value.close > current_data_value.ma60;
    var over_2percents_pre_close = current_data_value.close > pre_data_value.close*1.02;
    var in_10percents_ma = current_data_value.close < current_data_value.ma5*1.1 && 
                    current_data_value.close < current_data_value.ma10*1.1 &&
                    current_data_value.close < current_data_value.ma20*1.1 &&
                    current_data_value.close < current_data_value.ma60*1.1;
    if(break_ma && over_2percents_pre_close && in_10percents_ma && ma_tangle){
        tag_value = true;
    }
    return tag_value;
}

var res = above_all_ma( undefined, default_tag, undefined);
console.log(res);
