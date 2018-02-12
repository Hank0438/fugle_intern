var mongoose = require('mongoose');
var Promise = require('bluebird');
var _ = require('lodash');

var Schema = mongoose.Schema;

var TradingCalendar = new Schema({
    date: { type: Date },
    open_tw: { type: Boolean } 
}, { collection : 'trading_calendar'});

TradingCalendar.index({'date': 1}, {unique: true});
TradingCalendar.index({'open_tw': 1});

TradingCalendar.statics = {

    isTodayOpen: function(date) {
        return Promise.resolve(
            this.findOne({
                date: date
            }, {
                _id: 0,
                open_tw: 1
            }).lean().exec()
        ).then(function(result) {
            return result ? result.open_tw : false;
        });
    },

    updateData: function(date, openTw) {
        return this.update({
            date: date
        }, {
            open_tw: openTw
        }, {upsert: true}).exec();
    },

};

module.exports = TradingCalendar;
