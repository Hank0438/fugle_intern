var mongoose = require('mongoose');
var Promise = require('bluebird');
var request = require('request-promise');
var _ = require("lodash");

// db connection
var model = require('./model');
var fugle_tags = model.fugle_tags;


var function_names = [
    "fi_overbought",
    "dl_overbought",
    "it_overbought",
    "fi_oversold",
    "dl_oversold",
    "it_oversold"
];

function getData(symbol_id, type){

    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + symbol_id;
    return request(url).then(function(data){
        var container = JSON.parse(data.toString());
        return container;
    });
}

function updateDB(tags, symbol_id){

    return fugle_tags.update({
        'symbol_id' : symbol_id,
        'date' : tags[0].date
    },{
        tags : tags
    },{ upsert: true }).exec();



    // return fugle_tags.findOne({
    //     'symbol_id' : symbol_id,
    //     'date' : tags[0].date
    // }).exec().then(function(response){
    //     if(response === null){
    //         var new_obj = {
    //             symbol_id : symbol_id,
    //             date : tags[0].date,
    //             tags : tags
    //         };
    //         return fugle_tags.create(new_obj).then(function(response){
    //             console.log('create new one' + tags[0].date);
    //             return;
    //         }).catch(function(err){
    //             console.log(err);
    //         });
    //     }else{
    //         if(_.find(response.tags , { type : tags[0].type, date : tags[0].date })){
    //             return Promise.reject("duplicate ").catch(function(err){
    //                 console.log(err);
    //             });
    //         }else{
    //             response.tags.push(tag);
    //             return response.save().then(function(response){
    //                 console.log('update tags' + tag.date);
    //             });
    //         }
    //     }
    // }).catch(function(err){
    // //    console.log(err);
    // });
}


function getCompanyList(market){
    // https://api.fugle.tw/v1/data/company_list?market_type=tw.tse
    var url = "https://api.fugle.tw/v1/data/company_list?market_type=tw."+market;
    return request(url).then(function(data){
        var container = JSON.parse(data.toString());
        return container;
    });

}

if(require.main === module){
    var type = "FCNT000005";
    var market = process.argv[2] || "emg";
    getCompanyList(market).then(function(symbol_ids){
        return Promise.each(symbol_ids, function(symbol_info){
            var symbol_id = symbol_info.symbol_id;

            

    //var symbol_id = "1536";

            var tagFuns = function_names.map(function(tag_function_name){
                return require('../FCNT00005/day/'+tag_function_name);
            });

            var default_tags = tagFuns.map(function(tagFun){ return tagFun.default_tag; });


            console.log(symbol_id);
            return getData(symbol_id, type).then(function(container){

                var results = default_tags;

                return Promise.each(container.rawContent, function(content){

                    results = tagFuns.map(function(tagFun, idx){
                        return tagFun.judge(content, results[idx], undefined);
                    });

                    //console.log(results);
                    return updateDB(results, symbol_id);
                }).catch(function(err){
                    console.log(err);
                });
            });
        });


    })
    .then(function(){
        console.log("mongoose disconnect");
        mongoose.disconnect();
    });
}

module.exports={updateDB}
