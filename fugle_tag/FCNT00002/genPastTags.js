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
var TWStockPrice = connections.models['tw_stock_price'];


var function_names = require('./function_names').indicator;
var tagFuns = function_names.map((funName)=> require('./day/'+funName));
var default_tags = tagFuns.map(function(tagFun){ return tagFun.default_tag; });

//var market = "otc";
var market = process.argv[2] || "emg";
var bucket_size = Number(process.argv[3]) || 1;
var bucket = Number(process.argv[4]) || 0;

var ContentData = function(symbol_id){
    return TWStockPrice["get5y"](symbol_id);
    // .then(function(data){
    //     return data.map(row => row.toObject());
    // });
};



function getMaxdata(data, start_date){
    start_date = new Date(start_date);
    var end_date = moment(start_date).add(1,"y").toDate();
    var max = { value : Number.MIN_VALUE, date : new Date(0)};
    var min = { value : Number.MAX_VALUE, date : new Date(0)};

    data.forEach(function(row){
        var tmpDate = new Date(row.date);
        if(tmpDate >= start_date && tmpDate <= end_date){
            if(row.close > max.value){
                max.value = row.close;
                max.date = tmpDate;
            }

            if(row.close < min.value ){
                min.value = row.close;
                min.date = tmpDate;
            }
        }
    });

    return {
        max : max,
        min : min
    };
}

getCompanyList(market, bucket_size, bucket)
//Promise.resolve(["2330"].map(function(d){return {symbol_id:d};}))
.each(function(symbol_info){
    var symbol_id = symbol_info.symbol_id;
    console.log(symbol_id," start ", new Date());

    return ContentData(symbol_id).then(function(data){
        //console.log(data.length);
        var results = default_tags;
        var toDB = [];

        var start_date = moment(data[0].date).add(1,"y").toDate();
        var adata = data.filter(d => new Date(d.date) >= start_date);

        return Promise.each(adata, function(row){

            results = tagFuns.map(function(tagFun, idx){
                // no fields, no tag
                var keys = tagFun.require_fields;
                if(_.every(keys, (key)=> row.hasOwnProperty(key) )   ){
                    try{
                        return tagFun.judge(row, results[idx], undefined);
                    }catch(e){
                        if(e.name === "DataError"){
                            var pastMaxMin = getMaxdata(data, e.message);
                            results[idx].data_value = pastMaxMin;
                            return tagFun.judge(row, results[idx], undefined);
                        }else{
                            throw new Error();
                        }

                    }

                }else{
                    return null;
                }
            });

            toDB.push(results.filter( x => x ));
            for (var i = 0; i < results.length; i++) {
                results[i] = results[i] || tagFuns[i].default_tag;
            }
        }).then(function(){
            //console.log(JSON.stringify(toDB,null,1));
            // write to DB
            return groupWriteDB(symbol_id, toDB);
        }).then(function(){
            // reset toDB
            toDB = [];
            console.log(symbol_id,"done");
            return;
        });
    });

})
.then(function(){
    console.log("market", market , "done");
    //process.exit();
});

function groupWriteDB(symbol_id, groupData){
    return Promise.map(groupData, function(results){
        if(results.length > 0){
            return Tag.updateData({
                symbol_id : symbol_id,
                tag : results
            });
        }else {
            return;
        }
    },{concurrency:20});
}

function getCompanyList(market, bucket_size, bucket){
    bucket_size = bucket_size || 1;
    bucket = bucket || 0;
    var url = "https://api.fugle.tw/v1/data/company_list?market_type=tw."+market;
    return request(url).then(function(data){
        var symbol_ids = JSON.parse(data.toString());
        symbol_ids = symbol_ids.filter((val,idx)=>{
            return idx % bucket_size === bucket;
        });
        return symbol_ids;
    });
}
