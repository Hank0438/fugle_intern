/**
 * Created by bistin on 2014/8/8.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var Ticks = new Schema({
    date : {type: Date},
    strikePrice : {type: Number},
    open : {type : Number},
    high : {type : Number},
    low  : {type : Number},
    close: {type : Number},
    volume : {type : Number},   // 成交量 (成交股數)
    setPrice : {type : Number},
    openInt : {type : Number},
    bestBid : {type : Number},
    bestAsk : {type : Number},
    histHigh : {type : Number},
    histLow : {type : Number}
},{
    _id: false
});

var OptionSchema = new Schema({
    symbol_id : { type: String },
    year:      { type: Number },
    kMonth:      { type: Number },
    callput: { type: String },
    strikePrice : {type: Number},
    history:  [Ticks],
}, {     
    versionKey: false,
    collection : 'future' 
});

OptionSchema.plugin(updatedPlugin);
OptionSchema.index({symbol_id: 1, year: 1, kMonth: 1}, {unique: true});

OptionSchema.statics = {
    get : function(symbol_id) {
    },

    updateTicks : function(symbol_id, ticks) {
        var self = this;
        var match = {
            symbol_id: symbol_id,
            year : moment(ticks.date).year(),
            kMonth: ticks.kMonth,
            callput: ticks.callput,
            strikePrice : ticks.strikePrice,
            'history.date': ticks.date
        };
        return this.update(match, {
            $set: { 'history.$': ticks }
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
                    symbol_id: symbol_id,
                    year : moment(ticks.date).year(),
                    kMonth: ticks.kMonth,
                    callput: ticks.callput,
                    strikePrice : ticks.strikePrice,
                }, {
                    $push: { 'history': ticks }
                }, { upsert: true }).exec().then(function() {
                    return true;
                });
            }
        });
    }
}

module.exports = OptionSchema;
