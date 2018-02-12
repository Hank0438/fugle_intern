var Promise = require('bluebird');
var moment = require("moment");
var _ = require("lodash");
var request = require('request-promise');
var stock = "2330";
var type = "FCNT000002";//近3-4年股價
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
var close = [];
var sum = 0;
var n = 987-744+1;
var average = 0;
var variance = 0;


request(url).then(function(data){
    var container = JSON.parse(data.toString());
    var content = container.rawContent.day;
    for (var i = 744; i < 988; i++) {
        // close.push(content[i].close)
        console.log(content[i].close);
    }

    //[744] ---- 2015/01/05
    //[987] ---- 2015/12/31
    // for (var j = 744; j < 987+1; j++) {
    //     sum += close[j];
    // }
    // average = sum/n;
    // var temp = 0;
    // for (var k = 744; k < 987+1; k++) {
    //     temp += Math.pow((close[k] - average),2);
    // }
    // variance = temp/n;
    // console.log("n : " + n);
    // console.log("sum : " + sum);
    // console.log("average : " + average);
    // console.log("variance : " + variance);
});

