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
    oddlots     : {type : Boolean},  // 僅零股交易
    k9          : {type : Number},
    d9          : {type : Number}

},{
    _id: false
});

var StockSchema = new Schema({
    symbol_id : { type: String },
    year      : { type: Number },
    history   : [Tick],
}, {
    versionKey: false,
    collection : 'tw_stock_price'
});

StockSchema.plugin(updatedPlugin);
StockSchema.index({symbol_id: 1, year: -1}, {unique: true});
StockSchema.index({year: -1});

StockSchema.statics = {
    // TODO data 瘦身
    get : function(symbol_id) {
        return this.find({symbol_id: symbol_id, year:{$gte:(moment().year()-1)}}).exec().then(function(data) {
            var res = data.reduce(function(total, val) { return total.concat(val.history) }, []);
            res = _.sortBy(res, function(val) { return val.date; });
            return res;
        });
    },
    getAll: function(symbol_id) {
        return this.find({symbol_id: symbol_id}).exec().then(function(data) {
            var res = data.reduce(function(total, val) { return total.concat(val.history) }, []);
            res = _.sortBy(res, function(val) { return val.date; });
            return res;
        });
    },


    get5yRaw : function(symbol_id) {
        return this.find({
            symbol_id : symbol_id,
            year      : { $gte:(moment().year()-4) }
        }).lean().exec().then(function(data) {
            var res = data.reduce(function(total, val) { return total.concat(val.history); }, []);
            res = _.sortBy(res, function(val) { return val.date; });
            return res;
        });
    },

    get5y : function(symbol_id){
        return Promise.resolve(
            this.aggregate({
                $match: {
                    symbol_id : symbol_id,
                    year      : { $gte:(moment().year()-4) }
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
                turnover    : '$history.turnover'
            })
            .sort({ date: -1 })
            .exec()
        ).then(function(ticks){
            if (ticks.length === 0) {
                ticks.push({});
            }
            return ticks.reverse();
        });
    },


    get60 : function(symbol_id){
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
                turnover    : '$history.turnover'
            })
            .sort({ date: -1 })
            .exec()
        ).then(function(ticks){
            if (ticks.length === 0) {
                ticks.push({});
            }
            return ticks.reverse().slice(-60);
        });
    },



    getPrevUtil : function(symbol_id, until) {
        var startYear = moment(until,"YYYY").year()-2;
        var endYear = moment(until,"YYYY").year()-1;

        return this.find({symbol_id: symbol_id, year:{$gte:startYear, $lte :endYear }}).exec().then(function(data) {
            var res = data.reduce(function(total, val) { return total.concat(val.history) }, [])
            res = _.sortBy(res, function(val) {return val.date});
            return res;
        });
    },
    getByDate: function(symbol_id, momentDate) {
        return Promise.resolve(this.find({symbol_id: symbol_id, year:momentDate.year()}).limit(1).exec()).then(function(data) {
            if(_.isArray(data) && data.length > 0) {
                var res = _.find(data[0].history, function(daily) { return daily.date.getTime() === momentDate.toDate().getTime(); });
                if (res) { return res; }
            }
            throw new Error('no data');
        });
    },
    getLatest : function(symbol_id) {
        return Promise.resolve(this.find({symbol_id: symbol_id, year:moment().year()}).exec()).then(function(data) {
            if(_.isArray(data) && data.length > 0) {
                return data[0].history.pop();
            }else{
                throw new Error('no data');
            }
        });
    },
    getLatestDay: function(symbol_id) {
        return Promise.resolve(this.find({symbol_id: symbol_id}).sort({'year':-1}).limit(1).exec()).then(function(data) {
//      * use aggregate or not
/*        return Promise
            .resolve(
                this.aggregate({$match: {symbol_id:symbol_id}})
                    .sort({'year': -1})
                    .limit(1)
                    .unwind('history')
                    .sort({'history.date': -1})
                    .limit(1)
                    .exec())
            .then(function(data){*/
                if(_.isArray(data) && data.length > 0) {
                    var history = _.sortBy(data[0].history, function(ohlc) {
                        return ohlc.date;
                    });
                    return _.last(history);
//                    return data[0].history;
                }else{
                    throw new Error('no data');
                }
            });
    },
    getClosetPrevDay: function(symbol_id, date) {
        var year = date.getFullYear() - 1;
        return Promise.resolve(
            this.aggregate({$match: {symbol_id: symbol_id, year: {$gte: year}}})
                .unwind('history')
                .match({'history.date': {$lt: date}})
                .sort({'history.date': -1})
                .limit(1)
                .exec()
        ).then(function(data) {
            if (_.isArray(data) && data.length > 0) {
                return data[0].history;
            } else {
                return {};
            }
        });
    },

    updateYearData : function(symbolId, year, history) {
        return this.update({
            symbol_id : symbolId,
            year : year
        }, {
            $set : { history : history }
        }).exec();
    },

    updateData : function(symbolId, tick) {
        var self = this;
        var year = tick.date.getFullYear();
        var match = {
            symbol_id: symbolId,
            year: year,
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
                    year: year,
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
