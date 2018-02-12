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

var tagFunsMap = _.keyBy(tagFuns, row=> row.default_tag.type);

var market = "tse";

var today = moment().startOf('day').toDate();

var default_tags = tagFuns.map(function(tagFun){ return tagFun.default_tag; });

getCompanyList(market)
//Promise.resolve(["2330","3008"].map(function(d){return {symbol_id:d};}))
.then(function(symbol_ids){
    //symbol_ids = symbol_ids.slice(0,80);

    var toDB = [];
    return Promise.each(symbol_ids, function(symbol_info){
        var symbol_id = symbol_info.symbol_id;
        console.log(symbol_id,"start", new Date());
        var todayIndicatorP = StockIndicator.findOne({symbol_id : symbol_id, date: today}).lean().exec();
        var last2TagP = Tag.find({symbol_id : symbol_id}).sort({date:-1}).limit(2).lean().exec();

        return Promise.all([todayIndicatorP, last2TagP]).spread(function(indicator, last2Tag ){
            if(!indicator ){
                return "";
            }
            var tag, res;
            var restags = [];
            last2Tag = last2Tag.filter( row => row.date < today);
            if(last2Tag.length === 0){
                return "";
            }

            var lastTags = last2Tag[0].tags;
            var lastTagsMap = _.keyBy(lastTags, row=> row.type);
            tagFuns.forEach(function(tagFun){
                if(tagFun.default_tag.type in lastTagsMap){
                    tag = lastTagsMap[tagFun.default_tag.type];
                    res =  tagFun.judge(indicator, tag, undefined);
                    restags.push(res);
                }else{
                    var keys = _.keys(tagFun.default_tag.data_value);
                    if(_.every(keys, (key)=> indicator.hasOwnProperty(key))){
                        tag = tagFun.default_tag;
                        res =  tagFun.judge(indicator, tag, undefined);
                        restags.push(res);
                    };
                }
            });
            // console.log(JSON.stringify({symbol_id, tags: restags}, null,1 ));
            toDB.push({symbol_id, tag: restags});
            return "";
        });
    }).then(function(){
        //console.log(JSON.stringify(toDB, null, 4));
        return Promise.map(toDB, function(results){
            //console.log(JSON.stringify(results, null,1 ));
            if(results.tag.length > 0){
                return Tag.updateData(results);
            }else {
                return;
            }

        },{concurrency:1});

    }).catch(function(err){
        console.log(err);
    });
})

.then(function(){
    console.log("market" , "done");
    //process.exit();
});



function getCompanyList(market){
    // https://api.fugle.tw/v1/data/company_list?market_type=tw.tse
    var url = "https://api.fugle.tw/v1/data/company_list?market_type=tw."+market;
    return request(url).then(function(data){
        var container = JSON.parse(data.toString());
        return container;
    });
}
