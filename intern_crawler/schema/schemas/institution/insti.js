var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');

var updatedPlugin = require('../../plugins/updated_new');

var daily = new Schema({
    date: {type: Date},
    FIbuy: {type: Number},
    FIsell: {type: Number},
    ITbuy: {type: Number},
    ITsell: {type: Number},
    DLbuy_self: {type: Number},
    DLsell_self: {type: Number},
    DLbuy_hedge: {type: Number},
    DLsell_hedge: {type: Number},
    DLbuy: {type: Number},
    DLsell: {type: Number},
    total: {type: Number}
},{
    _id: false
});

var Insti = new Schema({
    symbol_id: {type: String},
    year:      {type: Number},
    history:  [daily],
},  { collection : 'insti' })

Insti.plugin(updatedPlugin);
Insti.index({symbol_id: 1, year: -1}, {unique: true});

Insti.statics = {
    get : function(symbol_id) {
        return this.find({symbol_id: symbol_id, year:{$gte:(moment().year()-1)}}).exec().then(function(data) {
            return _.chain(data)
                .reduce(function(total, val) { return total.concat(val.history) }, [])
                .sortBy(function(row) { return row.date; })
                .value();
        });
    },

    updateData: function(data) {
        var self = this;
        var match = {
            symbol_id: data.symbol_id,
            year : data.year,
            'history.date': data.history[0].date
        };
        return this.update(match, {
            $set: { 'history.$': data.history[0] }
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
                    year : data.year,
                }, {
                    $push: { 'history': data.history[0] },
                    $set: { updated_at: new Date() }
                }, { upsert: true }).exec().then(function() {
                    return true;
                });
            }
        });
    }
}

module.exports = Insti;
