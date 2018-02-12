var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var Tick = new Schema({
    date        : {type : Date},
    volume      : {type : Number},  // 成交量 (成交股數)
    amount      : {type : Number},  // 成交金額
    open        : {type : Number},
    high        : {type : Number},
    low         : {type : Number},
    close       : {type : Number},
    change      : {type : Number},  // 漲跌價
    change_rate : {type : Number},  // 漲跌幅
    avg         : {type : Number},  // 當日成交均價
    turnover    : {type : Number},  // 成交筆數
},{
    _id: false
});

var StockSchema = new Schema({
    symbol_id : { type: String },
    year      : { type: Number },
    history   : [Tick],
}, {
    versionKey: false,
    collection : 'us_stock_price' 
});

StockSchema.plugin(updatedPlugin);
StockSchema.index({symbol_id: 1, year: -1}, {unique: true});
StockSchema.index({year: -1});

StockSchema.statics = {
    get : function(symbol_id){
        var refDate = new Date(1967, 0, 1); // Sunday, 1st, Jan.
        return Promise.resolve(
            this.aggregate({
                $match: {
                    symbol_id : symbol_id, 
                    year      : { $gte: (moment().year()-4) }
                }
            })
            .unwind('history')
            .project({
                _id         : 0,
                date        : '$history.date',
                volume      : '$history.volume',
                amount      : '$history.amount',
                open        : '$history.open',
                high        : '$history.high',
                low         : '$history.low',
                close       : '$history.close',
                change      : '$history.change',
                change_rate : '$history.change_rate',
                avg         : '$history.avg',
                turnover    : '$history.turnover',
            })
            .sort({ date: 1 })
            .exec()
        ).map(function(tick){
            return tick;
        }).then(function(dailyData){
            var weeklyData = _.chain(_.cloneDeep(dailyData)).groupBy(function(d){
                // using moment.js in a big loop is too slow
                // so here just calculate week manually
                var diff = (d.date - refDate) / 86400 / 1000;
                var week = Math.floor(diff / 7);
                return week;
            }).values().map(function(ticks){
                return {
                    date:   ticks[ ticks.length-1 ].date,
                    open:   ticks[0].open,
                    high:   _.max(_.map(ticks, 'high')),
                    low:    _.min(_.map(ticks, 'low')),
                    close:  ticks[ ticks.length-1 ].close,
                    volume: _.sum(_.map(ticks, 'volume')),
                }
            }).value();
            weeklyData = _.map(weeklyData, function(tick, idx){
                var change = 0;
                var changeRate = 0;
                if (idx > 0){
                    change = tick.close - weeklyData[idx-1].close;
                    changeRate = change / weeklyData[idx-1].close;
                }
                return _.assign(tick, {change: change, change_rate: changeRate});
            });

            var monthlyData = _.chain(_.cloneDeep(dailyData)).groupBy(function(d){
                var m = ('0'+d.date.getMonth()).slice(-2);
                return d.date.getFullYear() + m;
            }).values().map(function(ticks){
                return {
                    date:   ticks[ ticks.length-1 ].date,
                    open:   ticks[0].open,
                    high:   _.max(_.map(ticks, 'high')),
                    low:    _.min(_.map(ticks, 'low')),
                    close:  ticks[ ticks.length-1 ].close,
                    volume: _.sum(_.map(ticks, 'volume')),
                }
            }).value();
            monthlyData = _.map(monthlyData, function(tick, idx){
                var change = 0;
                var changeRate = 0;
                if (idx > 0){
                    change = tick.close - monthlyData[idx-1].close;
                    changeRate = change / monthlyData[idx-1].close;
                }
                return _.assign(tick, {change: change, change_rate: changeRate});
            });

            return {
                day: dailyData,
                week: weeklyData,
                month: monthlyData
            }
        });
    },

    getClose5y : function(symbol_id){
        return Promise.resolve(this.find({
            symbol_id: symbol_id, 
            year: {$gte:(moment().year()-5)}
        }, {'history.date':1, 'history.close':1}).lean().exec()).then(function(data){
            var res = data.reduce(function(total, val){ return total.concat(val.history); }, []);
            res = _.sortBy(res, function(val){return val.date;});
            return res;
        });
    },

    getRecent : function(symbol_id){
        return Promise.resolve(
            this.aggregate({
                $match: {
                    symbol_id : symbol_id, 
                    year      : { $gte:(moment().year()-1) }
                }
            })
            .unwind('history')
            .project({
                _id         : 0,
                date        : '$history.date',
                volume      : '$history.volume',
                amount      : '$history.amount',
                open        : '$history.open',
                high        : '$history.high',
                low         : '$history.low',
                close       : '$history.close',
                change      : '$history.change',
                change_rate : '$history.change_rate',
                avg         : '$history.avg',
                turnover    : '$history.turnover',
            })
            .sort({ date: -1 })
            .limit(5)
            .exec()
        ).then(function(ticks){
            if (ticks.length === 0) {
                ticks.push({});
            }
            return ticks.reverse();
        });
    },

    getLatestBatch : function(symbol_id_list){
        return Promise.resolve(this.find({symbol_id: {$in: symbol_id_list}, year: moment().year()}).lean().exec()).then(function(data){
            return data.map(function(symbol_data){
                if (symbol_data && symbol_data.history && _.isArray(symbol_data.history)) {
                    var ret = symbol_data.history.pop();
                    ret.symbol_id = symbol_data.symbol_id;
                    return ret;
                } else {
                    return {};
                }
            });
        }).then(undefined, function(err){
            console.log(err);
            throw err;
        });
    },

    getByDatesBatch: function(symbolIds, dates) {
        // not implemented yet
        return null;
    },

    getByDates: function(symbolId, dates) {
        // not implemented yet
        return null;
    },

    updateData : function(symbolId, tick) {
        var self = this;
        var match = {
            symbol_id: symbolId,
            year: moment(tick.date).year(),
            'history.date': tick.date
        };
        return this.update(match, {
            $set: { 'history.$': tick }
        }).exec().then(function(response) {
            if (response.n > 0) { 
                if (response.nModified !== 0 || response.upserted) {
                    return self.update(match, {
                        $set: { updated_at: new Date() }
                    }).exec().then(function() {
                        return true;
                    });
                } else {
                    return false;
                }
            } else {
                return self.update({
                    symbol_id: symbolId,
                    year : moment(tick.date).year(),
                }, {
                    $addToSet: { 'history': tick },
                    $set: { updated_at: new Date() }
                }, { upsert: true }).exec().then(function() {
                    return true;
                });
            }
        });
    }
}

module.exports = StockSchema;
