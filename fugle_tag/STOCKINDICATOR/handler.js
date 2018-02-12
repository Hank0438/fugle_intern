'use strict';
var Promise = require('bluebird');
var moment = require('moment');
var request = require('request-promise');

var function_names = require('./function_names');
// var database = require('../database');

module.exports.index = (event, context, callback) => {
    Promise.each(event.Records, function(record){
        // Kinesis data is base64 encoded so decode here
        // const payload = new Buffer(record.kinesis.data, 'base64').toString('utf8');
        var payload = new Buffer(record.kinesis.data, 'base64').toString('utf8');
        payload =  JSON.parse(payload);
        payload = payload.data;

        var symbol_id = payload.symbol_id;

        var date = moment(payload.history[0].date, moment.ISO_8601).format('YYYYMMDD');
        return Promise.resolve(getPreviousTag(symbol_id, date)).then(function(previousTag){
            var new_tags = [];
            return Promise.each(previousTag, function(tag){
                if(function_names.indicator.indexOf(tag.type) >= 0){
                    var tagFun = require('./day/'+tag.type);
                    // console.log("tag.type"+tag.type);

                    //payload是20161023的資料
                    //tag是20131020的資料
                    var new_tag = tagFun.judge(payload.history[0], tag, undefined);
                    new_tags.push(new_tag);
                } 
                return Promise.resolve("");

            }).then(function(){
                console.log(new_tags);

            }).catch(function(err){
                console.log(err.stack);
                callback(err, null);
            });
        }).catch(function(err){
            console.log('get previous tag error');
            //callback(err, null);
        });
    }).then(function(){
        // mongoose.disconnect();
        callback(null, 'success');
    });

};

function getPreviousTag(symbol_id, date){
    // var url = 'https://api.fugle.tw/v1/data/update/FCNT000075-' + symbol_id + '-' + date;
    // return request(url).then(function(data){
    //     var container = JSON.parse(data.toString());
    //     return container.rawContent.tags;
    // });

    var fakeData = {
        contentId : "FCNT000075-2330-20161021",
        contentIdParams : ["symbol_id","tmp0"],
        specName : "個股Tag",
        rawContent : {
            _id : "580f5d1b80832b664706bbdb",
            date : "2016-10-20T16:00:00.000Z",
            symbol_id : "2330",
            tags : [{
                type : "kd_gold",
                date : "2016-10-20T16:00:00.000Z",
                tag_value : { tag : false },
                data_value : {
                    date : "2016-10-20T16:00:00.000Z",
                    k9 : 63.1634864497765562,
                    d9 : 64.2127861468066925
                }
            },{
                type : "kd_death",
                date : "2016-10-20T16:00:00.000Z",
                tag_value : { tag : false },
                data_value : {
                    date : "2016-10-20T16:00:00.000Z",
                    k9 : 63.1634864497765562,
                    d9 : 64.2127861468066925
                }
            },{
                type : "macd_gold",
                date : "2016-10-20T16:00:00.000Z",
                tag_value : { tag : false },
                data_value : {
                    date : "2016-10-20T16:00:00.000Z",
                    ema12 : 187.6878564067976640,
                    ema26 : 185.1900980406917085,
                    macd12_26 : 2.5669334012226730
                }
            },{
                type : "macd_death",
                date : "2016-10-20T16:00:00.000Z",
                tag_value : { tag : false },
                data_value : {
                    date : "2016-10-20T16:00:00.000Z",
                    ema12 : 187.6878564067976640,
                    ema26 : 185.1900980406917085,
                    macd12_26 : 2.5669334012226730
                }
            },{
                type : "rsi_gold",
                date : "2016-10-20T16:00:00.000Z",
                tag_value : { tag : false },
                data_value : {
                    date : "2016-10-20T16:00:00.000Z", 
                    rsi6 : 53.8459677489308106,
                    rsi12 : 57.3601015195837149,
                    up_avg6 : 0.8016630856995492,
                    up_avg12 : 0.9513640223137904,
                    down_avg6 : 0.6871449331988898,
                    down_avg12 : 0.7072174604769584
                }
            },{
                type : "rsi_death",
                date : "2016-10-20T16:00:00.000Z",
                tag_value : { tag : false },
                data_value : {
                    date : "2016-10-20T16:00:00.000Z", 
                    rsi6 : 53.8459677489308106,
                    rsi12 : 57.3601015195837149,
                    up_avg6 : 0.8016630856995492,
                    up_avg12 : 0.9513640223137904,
                    down_avg6 : 0.6871449331988898,
                    down_avg12 : 0.7072174604769584
                }
            }]
        }
    };

    return Promise.resolve(fakeData.rawContent.tags);
}




// previous day tag
// {
//     "_id" : ObjectId("580f08554ce7e40d5cba9aa6"),
//     "date" : ISODate("2016-10-20T16:00:00.000Z"),
//     "k9" : 63.1634864497765562,
//     "d9" : 64.2127861468066925,
//     "ema12" : 187.6878564067976640,
//     "ema26" : 185.1900980406917085,
//     "macd12_26" : 2.5669334012226730,
//     "rsi6" : 53.8459677489308106,
//     "rsi12" : 57.3601015195837149,
//     "up_avg6" : 0.8016630856995492,
//     "up_avg12" : 0.9513640223137904,
//     "down_avg6" : 0.6871449331988898,
//     "down_avg12" : 0.7072174604769584,
//     "symbol_id" : "2330"
// }


if(require.main === module){
    var data = {data:{
                symbol_id : "2330",
                name : "台積電",
                year : 2016,
                history : [
                    {
                        date : "2016-10-23T16:00:00.000Z",
                        k9 : 70.6804195379462783,
                        d9 : 66.3686639438532211,
                        ema12 : 188.1397246519057092,
                        ema26 : 185.5926833710108497,
                        macd12_26 : 2.5629549771571103,
                        rsi6 : 65.4494085568155839,
                        rsi12 : 62.4988264361562642,
                        up_avg6 : 1.0847192380829578,
                        up_avg12 : 1.0804170204543078,
                        down_avg6 : 0.5726207776657415,
                        down_avg12 : 0.6482826721038786
                    }
                ]
            }};

    var testRecord = [{
        kinesis : {
            data : new Buffer(JSON.stringify(data)).toString('base64')
        }
    }];
    var context = undefined;
    var callback = (err, res) => {console.log(res)};
    exports.index( {Records : testRecord}  , context , callback);
}
