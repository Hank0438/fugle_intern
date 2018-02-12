var Promise = require('bluebird');
var numeral = require("numeral");
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
        
    });
}

function psy(data){
   var psy_windows = [12, 24];
   var psy = {};
   psy_windows.forEach(function(windows){ psy[windows] = 0.0; });

   data.forEach(function(row, index){
    //    console.log(row.date + "price : "+row.close);     
       psy_windows.forEach(function(windows){
           psy[windows] += row.close/windows;
           if (index >= windows){//逐日改變psy的值
               psy[windows] -= data[index-windows].close/windows;
           }
           if(index >= windows - 1){//將psy的值寫入每天
               var field_name = 'psy' + windows;
               row[field_name] = psy[windows];
            //    console.log(row.date + field_name + " : " + row[field_name]);
           }
       });
   });
}
