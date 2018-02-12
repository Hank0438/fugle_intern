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

var RealtimeSchema = new Schema({
    symbol_id: { type: String },
    datetime: { type: Date },           // precise to minute
    ticks: [Tick],                      // ticks grouped by minute
}, {
    collection : 'mis_realtime_price',
});

//RealtimeSchema.plugin(updatedPlugin);
RealtimeSchema.index({symbol_id: 1, datetime: 1}, {unique: true});
RealtimeSchema.index({datetime: -1});

RealtimeSchema.statics = {
    get : function(symbolId, datetime){
        return this.findOne({symbol_id: symbolId, datetime: datetime}).exec();
    },

    getAllByStream: function(){
        return this.find({}).lean().stream();
    },

    getAllExpiredByStream: function(){
        var self = this;
        return Promise.resolve(this.find({}, {datetime: 1}).sort({'datetime': -1}).limit(1).lean().exec()).then(function(datetimes){
            if (datetimes.length < 1){ return null; }

            var lastestDatetime = datetimes[0].datetime;
            var lastestDate = moment(lastestDatetime).startOf('day'); 
            return {
                date: lastestDate,
                stream: self.find({datetime: {$lt: lastestDate}}).lean().stream(),
            };
        });
    },

    bulkUpdateData : function(rows, type){
        var promise;
        var bulk = this.collection.initializeUnorderedBulkOp({w: 0});
        if (type === 'tse') {
            promise = Promise.resolve(rows);
        } else{
            promise = this.bulkEmgPrepare(rows);
        }

        return promise.then(function(rows) {
            if (rows.length === 0) { return; }
            rows.forEach(function(row){
                var tick = _.pick(row, ['time', 'price', 'volume', 'total_volume', 'buy5', 'sell5']);
                bulk.find({
                    symbol_id: row.symbol_id,
                    datetime : row.datetime,
                }).upsert().updateOne({
                    $addToSet: { 'ticks': tick }
                });
            });
            return new Promise(function(resolve, reject){
                bulk.execute(function(err, result){
                   if (err){ reject(err); } 
                   resolve();
                });
            });
        });
    },

    bulkRemoveData : function(rows, type){
        var self = this;
        return Promise.map(rows, function(row){
            return self.removeData(row);
        });
    },

    bulkEmgPrepare: function(rows) {
        var self = this;
        return Promise.map(rows, function(row) {
            var startOfDay = new Date(row.datetime);
            var endOfDay = new Date(row.datetime);
            startOfDay.setHours(0); startOfDay.setMinutes(0);
            endOfDay.setHours(23); endOfDay.setMinutes(59);
            return Promise.resolve(
                self.aggregate([
                    { $match: {
                        symbol_id: row.symbol_id,
                        datetime: {
                            $gt: startOfDay,
                            $lt: endOfDay,
                        }
                    }},
                    { $unwind: '$ticks' },
                    { $sort: { 'ticks.time' : -1 } },
                    { $limit: 1 }
                ]).exec()
            ).then(function(ret){
                if (ret.length){
                    var lastTick = ret[0].ticks;
                    row.volume = row.total_volume - lastTick.total_volume;
                    if (lastTick.time === row.time || row.volume === 0){
                        return undefined;
                    }
                }else{
                    row.volume = row.total_volume;
                }
                return row;
            });
        }).filter(function(row){
            return row;
        });
    },

    removeData : function(row){
    }
};

module.exports = RealtimeSchema;
