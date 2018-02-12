var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");

// var default_data_value = { rsi_6 : 58.23, rsi_12 : 59.62, up_average_6 : 0.81, down_average_6 : 0.58, up_average_12 : 1.03, down_average_12 : 0.70, date : new Date(0) };
var default_data_value = { rsi_6 : 58.5077, rsi_12 : 58.7506, up_average_6 : 1.3050, down_average_6 : 0.9255, up_average_12 : 1.3171, down_average_12 : 0.9248, date : new Date(0) };
var default_tag = {
    date : new Date(0),
    type : "rsi_gold",
    tag_value : false,
    data_value : default_data_value
};

if(require.main === module){
    var stock = "2330";
    var type = "FCNT000002";//近3-4年股價
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var content = container.rawContent.day;
        var res = rsi_gold(content, default_tag, undefined);
        console.log(res);
    });
};

var rsi_gold = function(content, previousTag, option){
    //length是為了找最近的一筆資料
    var length = content.length-7;
    var today = content[length-1];
    var pre_data_value = previousTag.data_value;
    if(moment(pre_data_value.date).year() !== moment(today.date).year()){
        pre_data_value = default_data_value;
    }
    // var rsi_unknown = function(days){
    //     var up = 0;
    //     var down = 0;
    //     for (var i = 0; i < days; i++) {
    //         if(content[i].change >= 0){
    //             up += content[i].change;
    //         }else{
    //             down += Math.abs(content[i].change);
    //         }
    //     }
    //     var up_average = up/days;
    //     var down_average = down/days;
    //     for (var j = days; j < length; j++) {
    //         if(content[j].change >= 0){
    //             up_average = (up_average*(days-1) + content[j].change)/days;
    //             down_average = (down_average*(days-1))/days;
    //         }else{
    //             up_average = (up_average*(days-1))/days;
    //             down_average = (down_average*(days-1) + Math.abs(content[j].change))/days;
    //         }
    //     }
    //     var result = ( up_average / (up_average + down_average))* 100;
    //     console.log(days+"'up_average = "+ up_average);
    //     console.log(days+"'down_average = "+ down_average);
    //     console.log(days+"'rsi = "+result);
    //     return result;
    // }
    var rsi_f = function(days){
        if(days===6){
            up_average = pre_data_value.up_average_6;
            down_average = pre_data_value.down_average_6;
        }
        if(days===12){
            up_average = pre_data_value.up_average_12;
            down_average = pre_data_value.down_average_12;
        }
        if(content[length-1].change >= 0){
            up_average = (up_average*(days-1) + content[length-1].change)/days;
            down_average = (down_average*(days-1))/days;
        }else{
            up_average = (up_average*(days-1))/days;
            down_average = (down_average*(days-1) + Math.abs(content[length-1].change))/days;
        }
        var result = {
            rsi : ( up_average / (up_average + down_average))* 100,
            up_average : up_average,
            down_average : down_average
        }
        console.log(days+"'up_average = "+ up_average);
        console.log(days+"'down_average = "+ down_average);
        console.log(days+"'rsi = "+result);
        return result;
    }

    //for test
    var r_6 = 0;
    var r_12 = 0;
    var up_average = 0;
    var down_average = 0;
    for (var t = 0; t < 8; t++) {
        r_6 = rsi_f(6).rsi;
        r_12 = rsi_f(12).rsi;
        pre_data_value = {
            rsi_6 : r_6,
            rsi_12 : r_12,
            up_average_6 : rsi_f(6).up_average,
            down_average_6 : rsi_f(6).down_average,
            up_average_12 : rsi_f(12).up_average,
            down_average_12 : rsi_f(12).down_average,
            date : moment(content[length-1].date).toDate()
        }
        console.log(pre_data_value);
        length++;
    }
    var current_data_value = {
        date : moment(today.date).toDate(),
        rsi_6 : r_6,//rsi_f(6),
        rsi_12 : r_12//rsi_f(12)
    };
    //這邊回傳值的tag_value呼叫判斷式來判斷
    return {
        date : moment(today.date).toDate(),
        type : "rsi_gold",
        tag_value : judge_gold(pre_data_value, current_data_value),
        data_value : current_data_value
    };
}

var judge_gold = function(pre_data_value, current_data_value){
    var tag_value = false;
    if(current_data_value.rsi_6 > current_data_value.rsi_12 && pre_data_value.rsi_6 <= pre_data_value.rsi_12){
        tag_value = true;
    }
    return tag_value;
}
