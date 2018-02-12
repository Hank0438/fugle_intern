var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var Schema = mongoose.Schema;

var BestFive = new Schema({
    price: {type: Number},
    volume: {type: Number},
},{
    _id: false
});

var Tick = new Schema({
    time:   { type: String },           // HH:mm:ss
    price:  { type: Number },
    volume: { type: Number },
    total_volume: { type: Number },     // 總成交量(股)
    buy5:   [BestFive],
    sell5:  [BestFive],
},{
    _id: false
});

var RealtimeHistorySchema = new Schema({
    symbol_id: { type: String },
    datetime: { type: Date },           // precise to minute
    ticks: [Tick],                      // ticks grouped by minute
}, {
    collection : 'mis_realtime_price_history',
});

//RealtimeHistorySchema.plugin(updatedPlugin);
RealtimeHistorySchema.index({symbol_id: 1, datetime: 1}, {unique: true});
RealtimeHistorySchema.index({datetime: -1});

RealtimeHistorySchema.statics = {
    get : function(symbolId, datetime){
        return this.findOne({symbol_id: symbolId, datetime: datetime}).exec();
    },

    getAllByStream: function(){
        return this.find({}).lean().stream();
    },

    bulkUpdateData : function(rows){
        var self = this;
        return Promise.map(rows, function(row){
            return self.updateData(row);
        });
    },

    bulkRemoveData : function(rows){
        var self = this;
        return Promise.map(rows, function(row){
            return self.removeData(row);
        });
    },

    updateData : function(row){
    },

    removeData : function(row){
    }
};

module.exports = RealtimeHistorySchema;
