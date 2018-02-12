var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var arr = [];

var crawler = function(date){
    var url = "http://www.cnyes.com/futures/History.aspx?mydate=" + date + "&code=TX1";
    return request(url).then(function (data) {
        var $ = cheerio.load(data);
        var open = $("td.cr").eq(0).text();
        var close = $("td.cr").eq(3).text();;
        // if(open !== "目前尚未有資料"){
            var table = date + " " + open + " " + close;
            arr.push(table);
            console.log(date + " " + open + " " + close);
            // console.log(arr.length);
        // }
    });
}

var start = function(){
    var month = ""; //09
    var day = ""; //14
    var year = "2015";
    var limit_day = "";
    for (var m = 1; m <= 12; m++) {
        switch(m){
            case 1:
                month = "01";
                limit_day = 31;
                break;
            case 2:
                month = "02";
                limit_day = 28;
                break;
            case 3:
                month = "03";
                limit_day = 31;
                break;
            case 4:
                month = "04";
                limit_day = 30;
                break;
            case 5:
                month = "05";
                limit_day = 31;
                break;
            case 6:
                month = "06";
                limit_day = 30;
                break;
            case 7:
                month = "07";
                limit_day = 31;
                break;
            case 8:
                month = "08";
                limit_day = 31;
                break;
            case 9:
                month = "09";
                limit_day = 30;
                break;
            case 10:
                month = "10";
                limit_day = 31;
                break;
            case 11:
                month = "11";
                limit_day = 30;
                break;
            case 12:
                month = "12";
                limit_day = 31;
                break;
        };
        for (var d = 1; d <= limit_day; d++) {
            if(d < 10){
                day = "0" + d.toString();
            }else{
                day = d.toString();
            }
            var date = year + month + day;
            // console.log(date);
            crawler(date);
        }
    }
};

start();



