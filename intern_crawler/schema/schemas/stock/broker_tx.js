var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var updatedPlugin = require('../../plugins/updated_new');

var BrokerTxSchema = new Schema({
    symbol_id : {type: String},
    date: {type: Date},
    broker: {type: String},
    broker_name: {type: String},
    data: [{
        _id: false,
        price: {type: String},
        buy: {type: Number},
        sell: {type: Number},
    }]
},  { collection : 'broker_tx' })

BrokerTxSchema.plugin(updatedPlugin);
BrokerTxSchema.index({symbol_id: 1, date: -1, broker: 1}, {unique: true});
BrokerTxSchema.index({date: -1});
BrokerTxSchema.index({broker: 1});

BrokerTxSchema.statics = {
    get : function(symbol_id, date, broker) {
        return this.findOne({symbol_id: symbol_id, date: date, broker: broker}).exec();
    },

    getTop10: function(symbol_id) {
        var self = this;
        var ret_date;
        return this.find({symbol_id: symbol_id}, {date: 1}).sort({date: -1}).limit(1).exec().then(function(data) {
            // find the latest date
            return data[0].date;
        }).then(function(date) {
            ret_date = date;
            return self.find({symbol_id: symbol_id, date: date}).exec();
        }).then(function(data) {
            // return an array composed of top 10 buying and selling brokers with 
            // their trade count, sorted in decending order
            var all_data = data.map(function(row) {
                return {
                    broker: row.broker,
                    broker_name: row.broker_name,
                    data: row.data.reduce(
                        function(prev, cur) {
                            return {
                                count: prev.count + cur.buy - cur.sell,
                                buy_count: prev.buy_count + cur.buy,
                                buy_avg_price: prev.buy_avg_price + cur.buy * cur.price,
                                sell_count: prev.sell_count + cur.sell,
                                sell_avg_price: prev.sell_avg_price + cur.sell * cur.price
                            };
                        },
                        {
                            count: 0,
                            buy_count: 0,
                            buy_avg_price: 0,
                            sell_count: 0,
                            sell_avg_price: 0
                        }
                    )
                };
            }).sort(function(a, b) {
                return b.data.count - a.data.count;
            });

            var len = all_data.length;
            var calc_avg = function(obj) {
                obj.data.buy_avg_price = obj.data.buy_avg_price / obj.data.buy_count;
                obj.data.sell_avg_price = obj.data.sell_avg_price / obj.data.sell_count;
                return obj;
            };

            return {
                date: ret_date,

                top_buyers: all_data.slice(0, (len >= 10 ? 10 : len)).filter(function(obj) {
                    return obj.data.count > 0;
                }).map(calc_avg),

                top_sellers: all_data.slice((len >= 10 ? len - 10 : 0), len).filter(function(obj) {
                    return obj.data.count < 0;
                }).map(calc_avg).reverse()
            };
        }).then(undefined, function(e) {
            return {};
        });
    },

    getSymbolIdsByDate : function(date) {
        return this.find({date: date}).distinct('symbol_id').exec();
    },

    updateData : function(row) {
        var self = this;
        var match = {
            symbol_id: row.symbol_id,
            date: row.date,
            broker: row.broker
        };
        return Promise.resolve(
            this.update(match, {
                $set: {
                    broker_name: row.broker_name,
                    data: row.data
                }
            }, { upsert: true }).exec()
        ).then(function(response) {
            if (response.nModified !== 0 || response.upserted) {
                return self.update(match, {
                    $set: { updated_at: new Date() }
                }).exec().then(function() {
                    return true;
                });
            } else {
                return false;
            }
        });
    }
}

module.exports = BrokerTxSchema;
