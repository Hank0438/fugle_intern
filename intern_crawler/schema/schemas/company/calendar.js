var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var CalendarSchema = new Schema({
    symbol_id: String,
    date: Date,             // 事件日期
    event: String,          // 事件: '法說會', '常會', '臨時會'
    data: [{
        _id: false,
        title: String,
        content: {}
    }],
},  { collection : 'calendar' });

CalendarSchema.plugin(updatedPlugin);
CalendarSchema.index({symbol_id: 1, date: -1, event: 1}, {unique: true});
CalendarSchema.index({symbol_id: 1, event: 1});
CalendarSchema.index({date: -1});

CalendarSchema.statics = {
    get : function(symbol_id) {
        return this.find({symbol_id: symbol_id, year:{$gte:(moment().year()-1)}}).exec().then(function(data) {
            var res = data.reduce(function(total, val) { return total.concat(val.history) }, [])
            res = _.sortBy(res, function(val) {return val.date});
            return res;
        });
    },

    getSpecific: function(symbol_id, date, event) {
        return this.find({symbol_id: symbol_id, date: date, event: event}).exec().then(function(data) {
            return (data.length)? data[0] : data;
        });
    },

    removeByYear: function(momentDate, events) {
        var start = momentDate.clone().startOf('year').toDate();
        var end = momentDate.clone().endOf('year').toDate();
        return this.remove({date: {$gte: start, $lte: end}, event: {$in: events}}).exec();
    },

    removeByMonth: function(momentDate, events) {
        var start = momentDate.clone().startOf('month').toDate();
        var end = momentDate.clone().endOf('month').toDate();
        return this.remove({date: {$gte: start, $lte: end}, event: {$in: events}}).exec();
    },

    updateEvent: function(data) {
        var self = this;
        var details = _.pairs(_.omit(data, 'symbol_id', 'date', 'event'))
            .map(function(el, idx) {
                return {
                    title: el[0],
                    content: el[1]
                };
            });
        var match = {
            symbol_id: data.symbol_id,
            date: data.date,
            event: data.event
        };
        return Promise.resolve(
            this.update(match, {
                $set: { 
                    data: details
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

module.exports = CalendarSchema;
