'use strict';
// useful function
var Promise = require('bluebird');
var moment = require('moment');
var request = require('request-promise');
var _ = require("lodash");

// db dependency
var mongoose = require('mongoose');
mongoose.Promise = Promise;
var config = require('../../crawler/config');
var connections = require('../../crawler/config/connections')('fugle', ['company','technical']);

// models
var Tag = connections.models['tag'];
var TWStockPrice = connections.models['tw_stock_price'];

// judge functions
var function_names = require('./function_names').indicator;
var tagFuns = function_names.map((funName)=> require('./day/'+funName));
var tagFunsMap = _.keyBy(tagFuns, row=> row.default_tag.type);
var default_tags = tagFuns.map(function(tagFun){ return tagFun.default_tag; });


var today = moment().startOf('day').toDate();
var market = process.argv[2] || "emg";
var toDB = [];


function getCurrentContentData(symbol_id, today){
    return TWStockPrice.getByDate(symbol_id, moment(today));
}


getCompanyList(market)
//Promise.resolve(["2330","3008"].map(function(d){return {symbol_id:d};}))
.each(function(symbol_info){
    //symbol_ids = symbol_ids.slice(0,80);
    var symbol_id = symbol_info.symbol_id;
    console.log(symbol_id,"start", new Date());

    var currentDataP = getCurrentContentData(symbol_id, today);
    var last2TagP = Tag.find({symbol_id : symbol_id}).sort({date:-1}).limit(3).lean().exec();

    return Promise.all([currentDataP, last2TagP]).spread(function(currentData, last2Tag ){
        //console.log(currentData, last2Tag);
        if(!currentData ){
            return "";
        }

        last2Tag = last2Tag.filter( row => row.date < today);
        if(last2Tag.length === 0){
            return "";
        }

        var tag, res;
        var restags = [];

        var lastTags = last2Tag[0].tags;
        var lastTagsMap = _.keyBy(lastTags, row=> row.type);
        tagFuns.forEach(function(tagFun){
            if(tagFun.default_tag.type in lastTagsMap){
                tag = lastTagsMap[tagFun.default_tag.type];
                res =  tagFun.judge(currentData, tag, undefined);
                restags.push(res);
            }else{
                var keys = _.keys(tagFun.default_tag.data_value);
                if(_.every(keys, (key)=> currentData.hasOwnProperty(key))){
                    tag = tagFun.default_tag;
                    res =  tagFun.judge(currentData, tag, undefined);
                    restags.push(res);
                };
            }
        });
        // console.log(JSON.stringify({symbol_id, tags: restags}, null,1 ));
        toDB.push({symbol_id, tag: restags});
        return "";
    }).catch(function(err){
        console.log(err);
    });

}).then(function(){
    console.log(JSON.stringify(toDB,null,1));
    //return groupWriteDB(toDB);
}).catch(function(err){
    console.log(err);
})
.then(function(){
    console.log("market" , "done");
    //process.exit();
});

function groupWriteDB(groupData){
    return Promise.map(groupData, function(results){
        //console.log(JSON.stringify(results, null,1 ));
        if(results.tag.length > 0){
            return Tag.updateData(results);
        }else {
            return;
        }

    },{concurrency:1});
}


function getCompanyList(market, bucket_size, bucket){
    bucket_size = bucket_size || 1;
    bucket = bucket || 0;
    var url = "https://api.fugle.tw/v1/data/company_list?market_type=tw."+market;
    return request(url).then(function(data){
        var symbol_ids = JSON.parse(data.toString());

        symbol_ids = symbol_ids.filter(function(val,idx){
            return idx % bucket_size === bucket;
        });
        return symbol_ids;
    });
}
