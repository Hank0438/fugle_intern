var Promise = require('bluebird');
var moment = require("moment");
var _ = require("lodash");
var stats = require("stats-lite");

if(require.main === module){
    var request = require('request-promise');
    var type = "FCNT000002";//近3-4年股價
    var stock = process.argv[2] || "2330";
    var param = process.argv[3] || 5;
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        history_volatility(day, param); //以今日為基期
    });
}

function history_volatility(data, range){
    var temp = 0;
    var arr = [];
    var today_lastYear = moment().subtract(1,"years").format("YYYY-MM-DD").toString();
    // console.log(today_lastYear);
    if(moment(data[0].date).isAfter(today_lastYear)){
        var dataEach = data;
        // console.log("lalala");
    }else{
        if(range === "year"){
            var index = null;
            for (var t = 0; t < data.length; t++) {
                for (var n = 0; n < 25; n++) { //找目標日期以後的最近交易日
                    if(moment(data[t].date).subtract(n, "days").format("YYYY-MM-DD").toString() === today_lastYear){
                        index = t;
                        // console.log(index);
                        break;
                    }
                }
                if(index === t) break;
            }
            var dataEach = data.slice(index); //2016-01-03
        }else{
            var dataEach = data.slice(-(range+1));
        }
    }

    dataEach.forEach(function(element,index){
        if(index !== 0){
            var return_rate = element.close/temp.close;
            var ln_rr = Math.log(return_rate);
            arr.push(ln_rr);
        }
        temp = element;
        // console.log("date : "+element.date);
        // console.log("return_rate : "+return_rate);
        // console.log("ln_rr : "+ln_rr);
    });

    var stdev = stats.stdev(arr);
    // console.log("stdev : "+stdev);
    if(range === 12) var year = 240;
    else if(range === 6) var year = 120;
    else var year = data.length;
    var h_volatility = stdev*Math.sqrt(year);
    console.log("year: "+year);
    // console.log("h_volatility : "+h_volatility);
    return h_volatility;
};

module.exports={history_volatility : history_volatility};