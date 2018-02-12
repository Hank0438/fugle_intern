var Promise = require('bluebird');
var request = require('request-promise');
var _ = require("lodash");
var moment = require("moment");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var code = [];
var name = [];
var date = [];
var time = [];
var location = [];
var descript = [];
var url = "http://mops.twse.com.tw/mops/web/t100sb02_1";
var type = ["sii","otc","rotc","pub"];
var month = ["01","02","03","04","05","06","07","08","09","10","11","12"];
var eventsArr = [];
var options = {
            method: 'POST',
            uri: url,
            form: "payload",
            headers: {
                'cache-control': "no-cache",
                'postman-token': "d318ad7b-873e-5811-9e04-b3799655aaf8",
                'content-type': "application/x-www-form-urlencoded"
            }
};

var crawler = function(payload){
        return request(options)
            .then(function (body) {
                var ss = ["even","odd"];
                var $ = cheerio.load(body);
                ss.forEach(function(z){
                    $("tr")
                    .filter(function(i, el){
                        return $(this).attr('class') === z;
                    })
                    .map(function(i, el) {
                        var code = $(this).children().eq(0).text();
                        var name = $(this).children().eq(1).text();
                        var date = $(this).children().eq(2).text();
                        var time = $(this).children().eq(3).text();
                        var location = $(this).children().eq(4).text();
                        var descript = $(this).children().eq(5).text();
                        date = date.replace("105","2016");
                        date = date.replace("/","-")
                        date = date.replace("/","-")
                        if(date.length != 10) date = date.replace(date.slice(10,25),"");
                        var event = {
                            'summary': code + name,
                            'location': location,
                            'description': descript,
                            'start': {
                                'dateTime': date +'T'+ time +':00+08:00',
                                'timeZone': 'Asia/Taipei',
                            },
                            'end': {
                                'dateTime': date +'T'+ time +':00+08:00',
                                'timeZone': 'Asia/Taipei',
                            },
                        };
                        console.log(event.start.dateTime + event.summary);
                        eventsArr.push(event);
                    });
                });
            })
            .catch(function (err) {
                console.log("err : "+ err);// POST failed...
            });
}

function go(){
    return Promise.each(month, function(mo){
        return Promise.each(type, function(ty){
            return Promise.delay(3000).then(function(){
                return new Promise(function(resolve,reject){
                    var payload = "encodeURIComponent=1&step=1&firstin=1&off=1&TYPEK="+ty+"&year=105&month="+mo+"&co_id=";
                    options.form = payload;
                    crawler(payload);
                    resolve(ty+mo);
                }).then(function(res){
                    console.log(res);
                })
            });
        });
    });
}

go();