var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");
var _ = require("lodash");


// var arr = [];
// request("https://api.fugle.tw/v1/data/company_list?market_type=tw.emg").then(function(data){
//     var container = JSON.parse(data.toString());
//     container.forEach(function(stock){
//         arr.push(stock.symbol_id);
//     });
// });


if(require.main === module){
    var request = require('request-promise');
    var type = "FCNT000002";//近3-4年股價
    var stock = process.argv[2] || "2330";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        calcMaIndex(day);//每天都有ma5,10,20,60
        bias(day);//每天都有bias5,10,20,60
        var ma_windows = [5, 10, 20, 60];
        var sample = day.slice(0,20);
        sample = sample.concat(day.slice(-10));
        sample.forEach(function(content){
            ma_windows.forEach(function(windows){
                if(day.length < parseInt(windows)){
                    console.log("The trading day "+ day.length +" is less than ma "+windows+".");
                }
                var field_name = "bias"+windows;
                console.log(moment(content.date).toDate() + "$" +field_name+" : "+content[field_name])
            });
            console.log("=======================================");
        });
    });
}


//計算MA
function calcMaIndex(data){
   var ma_windows = [5, 10, 20, 60];
   var ma = {};
   ma_windows.forEach(function(windows){ ma[windows] = 0.0; });

   data.forEach(function(row, index){
    //    console.log(row.date + "price : "+row.close);     
       ma_windows.forEach(function(windows){
           ma[windows] += row.close/windows;
           if (index >= windows){//逐日改變MA的值
               ma[windows] -= data[index-windows].close/windows;
           }
           if(index >= windows - 1){//將MA的值寫入每天
               var field_name = 'ma' + windows;
               row[field_name] = ma[windows];
            //    console.log(row.date + field_name + " : " + row[field_name]);
           }
       });
   });
}


// definition：
// 乖離率(%) = ( 目前股價 - 平均股價 ) / 平均股價
// source：
// http://www.cmoney.tw/notes/note-detail.aspx?nid=16060

function bias(data){
    var ma_windows = [5, 10, 20, 60];
    data.forEach(function(row, index){
        ma_windows.forEach(function(windows){
            if(index >= windows - 1){
                var ma = 'ma' + windows;
                var field_name = 'bias' + windows;
                row[field_name] = (row.close - row[ma]) / row[ma]
            }
        });
    });
}