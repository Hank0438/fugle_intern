/**
 * Created by bistin on 2014/8/26.
 */
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
    // set date/month/season corresponding to `period`
    date: Date, 
    month: Number,
    season: Number,
    value: Number
},{
    _id: false
});

var StatisticSchema = new Schema({
    symbol_id : String,
    type: String,
    year: Number,
    period: String,  // day/month/season/halfYear/year 
    histories: [Record]
}, {collection: 'statistic'});

StatisticSchema.plugin(updatedPlugin);
StatisticSchema.index({symbol_id: 1, type: 1, year: -1}, {unique: true});

StatisticSchema.statics = {
    get : function(symbol_id) {
        return this.find({symbol_id: symbol_id}, {_id:0}).exec();
    },

    updateData : function(data) {
        var self = this;
        var periodMapping = {
            'day': 'date',
            'month': 'month',
            'season': 'season'
        };
        var recordTimeBase = periodMapping[data.period];
        var match = {
            symbol_id: data.symbol_id,
            type: data.type,
            year: data.year,
            period: data.period
        };
        match['histories.'+recordTimeBase] = data.record[recordTimeBase];
    	return this.update(match, {
            $set: { 'histories.$': data.record }
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
                    symbol_id: data.symbol_id,
                    type: data.type,
                    year: data.year,
                    period: data.period,
                },{
                    $push: { 
                        'histories': {
                            $each: [data.record],
                            $sort: {date: 1, month: 1, season: 1}
                        }
                    }
                }, { upsert: true }).exec().then(function() {
                    return true;
                });
            }
        });
    }

};

module.exports = StatisticSchema;
