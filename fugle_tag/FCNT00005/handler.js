'use strict';
var Promise = require('bluebird');
var moment = require('moment');
var request = require('request-promise');
var aws = require('aws-sdk');

var function_names = require('./function_names');
// var database = require('../database');
var kinesis = new aws.Kinesis();

module.exports.index = (event, context, callback) => {
    Promise.each(event.Records, function(record){
        // Kinesis data is base64 encoded so decode here
        // const payload = new Buffer(record.kinesis.data, 'base64').toString('utf8');
        var payload = new Buffer(record.kinesis.data, 'base64').toString('utf8');
        payload =  JSON.parse(payload);
        payload = payload.data;

        var symbol_id = payload.symbol_id;

        if(symbol_id.length > 4){
            return Promise.resolve(123);
        }
        var date = moment(payload.history[0].date, moment.ISO_8601).add(8,"h").format('YYYYMMDD');
        return Promise.resolve(getPreviousTag(symbol_id, date)).then(function(previousTag){
            var new_tags = [];
            return Promise.each(previousTag, function(tag){
                if(function_names.FCNT000005.indexOf(tag.type) >= 0){
                    //console.log(tag.type)
                    var tagFun = require('./day/'+tag.type);
                    var new_tag = tagFun.judge(payload.history[0], tag, undefined);
                    new_tags.push(new_tag);
                } 
                return Promise.resolve("");
            }).then(function(){
        
                kinesis.putRecord({
                    Data: JSON.stringify({ symbol_id : symbol_id, tag : new_tags  }),
                    PartitionKey: "key",
                    StreamName: "db.company.tag"
                }, function(err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(symbol_id , data);
                    }
                });

            }).catch(function(err){
                console.log(err);
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
    var url = 'https://api.fugle.tw/v1/data/update/FCNT000075-' + symbol_id + '-' + date;
    return request(url).then(function(data){
        var container = JSON.parse(data.toString());
        return container.rawContent.tags;
    });
}


if(require.main === module){
    var data = {data:{
                "symbol_id": "2330",
                "name": "台積電",
                "year": 2016,
                "history": [
                    {
                        "date":"2016-08-14T16:00:00.000Z",
                        "FIbuy":12101571,
                        "FIsell":7480199,
                        "ITbuy":0,
                        "ITsell":113000,
                        "DLbuy":106000,
                        "DLsell":436000,
                        "total":4178372
                    }
                ]
            }};

    var testRecord = [{
        kinesis : {
            data : new Buffer(JSON.stringify(data)).toString('base64')
        }
    },{
        kinesis : {
            data : new Buffer(JSON.stringify(data)).toString('base64')
        }
    }];
    var context = undefined;
    var callback = (err, res) => {console.log(res)};
    exports.index( {Records : testRecord}  , context , callback);
}
