var Promise = require('bluebird');
var moment = require("moment");
var _ = require("lodash");

if(require.main === module){
    var request = require('request-promise');
    var type = "FCNT000002";//近3-4年股價
    var stock = process.argv[2] || "2330";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        william(day);
    });
}
//definition:
//威廉指標 = (最近N日內最高價 - 第N天收盤價)/(最近N日內最高價 - 最近N日內最低價)*-100                  

function william(data){
    var william_windows = [14, 28, 42];
    var william = {};
    william_windows.forEach(function(windows){ william[windows] = 0.0; });

    data.forEach(function(row, index){
        // console.log(row.date + "price : "+row.close);
        william_windows.forEach(function(windows){
            if(index >= windows - 1){//將william的值寫入每天
                var days = data.slice(index + 1 - windows, index + 1);
                var low_days =  (_.min(days, "low")).low;
                var high_days = (_.max(days, "high")).high;
                william[windows] = (high_days - data[index].close) / ( high_days - low_days )*-100;
                var field_name = 'william' + windows;
                row[field_name] = william[windows];
                console.log(row.date + field_name + " : " + row[field_name]);
            }
        });
    });
};