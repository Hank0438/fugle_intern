'use strict';
var Promise = require('bluebird');
var moment = require('moment');
var request = require('request-promise');
var _ = require("lodash");


var mongoose = require('mongoose');
mongoose.Promise = Promise;
var config = require('../../crawler/config');
var connections = require('../../crawler/config/connections')('fugle', ['company','technical']);
var Tag = connections.models['tag'];
var StockIndicator = connections.models['stock_indicator'];


var function_names = require('./function_names').indicator;
var tagFuns = function_names.map(function(tag_function_name){
    return require('./day/'+tag_function_name);
});
var default_tags = tagFuns.map(function(tagFun){ return tagFun.default_tag; });

function getCompanyList(market){
    // https://api.fugle.tw/v1/data/company_list?market_type=tw.tse
    var url = "https://api.fugle.tw/v1/data/company_list?market_type=tw."+market;
    return request(url).then(function(data){
        var container = JSON.parse(data.toString());
        return container;
    });
}

//var market = "otc";
var market = process.argv[2] || "emg";
var bucket_size = Number(process.argv[3]) || 1;
var bucket = Number(process.argv[4]) || 0;

getCompanyList(market)
//Promise.resolve(["2330"].map(function(d){return {symbol_id:d}}))
.then(function(symbol_ids){

    symbol_ids = symbol_ids.filter(function(val,idx){
        return idx % bucket_size === bucket;
    });

    return Promise.each(symbol_ids, function(symbol_info){
        var symbol_id = symbol_info.symbol_id;
        console.log(symbol_id,"start", new Date());
        return StockIndicator.find({symbol_id : symbol_id}).sort({date:1}).lean().exec().then(function(data){
            var results = default_tags;
            //data = data.slice(-50);
            var toDB = [];
            return Promise.each(data, function(row){
                results = tagFuns.map(function(tagFun, idx){
                    var keys = _.keys(tagFun.default_tag.data_value);
                    // console.log(keys,  _.keys(row))
                    if(_.every(keys, (key)=> row.hasOwnProperty(key) )   ){
                         // console.log(function_names[idx],'nononon')
                        return tagFun.judge(row, results[idx], undefined);
                    }else{
                        // console.log(function_names[idx], _.keys(row))
                        return null;
                        // return results[idx];
                    }
                });
                toDB.push(results.filter(x=>x));
                for (var i = 0; i < results.length; i++) {
                    if(!results[i]){
                        results[i] = tagFuns[i].default_tag;
                    }
                }
            }).then(function(){
                return Promise.map(toDB, function(results){
                    //console.log(results)
                    if(results.length > 0){
                        return Tag.updateData({
                            symbol_id : symbol_id,
                            tag : results
                        });
                    }else {
                        return;
                    }

                },{concurrency:10});
            }).then(function(){
                toDB = [];
                console.log(symbol_id,"done");
                return;
            });
        });
    });
})
.then(function(){
   console.log("market", market , "done");
});
