var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');
var _ = require('underscore');

var updatedPlugin = require('../../plugins/updated_new');

/* 
 * TYPES:
 * PER = P/E Ratio = 本益比
 * YR = Yield Rate = 殖利率 
 * PBR = P/B Ratio = 股價淨值比
 */
var Record = new Schema({
    symbol_id : String,
    value: Number
},{
    _id: false
});

var RankingSchema = new Schema({
    type: String,
    year: Number,
    period: String,  // day/month/season/halfYear/year 
    date: Date,
    month: Number,
    season: Number,
    symbols: [Record]
}, {collection: 'ranking'});

RankingSchema.plugin(updatedPlugin);
RankingSchema.index({type: 1, year: -1});

RankingSchema.statics = {
    get : function(symbol_id){
        return this.find({symbol_id: symbol_id}, {_id:0}).exec();
    },

    updateData : function(data){
        var self = this;
        var periodMapping = {
            'day': 'date',
            'month': 'month',
            'season': 'season'
        };
        var recordTimeBase = periodMapping[data.period];
        var match = {
            type: data.type,
            year: data.year,
            period: data.period,
            'symbols.symbol_id': data.symbol.symbol_id
        };
        match[recordTimeBase] = data[recordTimeBase];
        return this.update(match, {
            $set: { 'symbols.$': data.symbol }
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
                return self.update(
                    _.omit(match, 'symbols.symbol_id'), {
                    $push: { 
                        'symbols': {
                            $each: [data.symbol],
                            $sort: {value: -1}
                        }
                    },
                    $set: { updated_at: new Date() }
                }, { upsert: true }).exec().then(function() {
                    return true;
                });
            }
        });
    }

};

module.exports = RankingSchema;
