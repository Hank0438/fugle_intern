/**
 * Created by bistin on 2014/8/8.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var updatedPlugin = require('../../plugins/updated_new');

var lastYear = moment().add(-1,'year').year();
var Revenue = new Schema({
    symbol_id : String,
    data : Schema.Types.Mixed,
    month : Number,
    year : Number,
},{collection : 'revenue'});

Revenue.plugin(updatedPlugin);
Revenue.index({symbol_id: 1, year: -1, month:-1}, { unique: true });

Revenue.statics = {
    get : function(symbol_id){
        return this.find({symbol_id: symbol_id},{_id:0}).limit(2).exec().then(function(data){
            var mom = (data[0]['data']['current'].revenue - data[1]['data']['current'].revenue)/data[1]['data']['current'].revenue*100;
            data[0]['data']['current'].mom = mom;
            return data[0];
        });
    },
    get5y : function(symbol_id){
        var thisYear = moment().year();
        return this.find({
            symbol_id: symbol_id, 
            year:{ $gte : thisYear-5 }
        },{ _id: 0 }).limit(49).exec().then(function(data){
            data.forEach(function(monthData,idx){
                if(idx === data.length-1){ return; }  // make sure data has mom
                var mom = (data[idx]['data']['current'].revenue - data[idx+1]['data']['current'].revenue)/data[idx+1]['data']['current'].revenue*100;
                data[idx]['data']['current'].mom = mom;
            })
            return data;
        });
    },
    getLastYear : function(symbol_id){
        return this.find({symbol_id: symbol_id , year:{ $gte : lastYear-1 }},{_id:0}).limit(25).exec().then(function(data){
            data.forEach(function(monthData,idx){
                if(idx === data.length-1){return}  // make sure data has mom
                var mom = (data[idx]['data']['current'].revenue - data[idx+1]['data']['current'].revenue)/data[idx+1]['data']['current'].revenue*100;
                data[idx]['data']['current'].mom = mom;
            })
            return data;
        });
    }
};

module.exports = Revenue;
