/**
 * Created by bistin on 2014/8/19.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var updatedPlugin = require('../../plugins/updated_new');

var SubSchema = new Schema({
    buy : { type: Number },
    sell : { type: Number },
    outstanding : { type: Number },
    yremain : { type: Number },
    remain : { type: Number },
    limit : { type: Number },
},{
    _id: false,
});

var DataSchema = new Schema({
    date : Date,
    net : Number,
    bearish : SubSchema,
    finance : SubSchema,
},{
    _id: false,
});

var sheetSchema = new Schema({
    symbol_id : { type: String },
    year      : { type: Number },
    history      : [DataSchema],
}, { collection : 'margin'});

sheetSchema.plugin(updatedPlugin);
sheetSchema.index({symbol_id: 1, year: -1}, {unique: true});

sheetSchema.statics = {

    get : function(symbol_id) {
        return this.find({symbol_id: symbol_id},{_id:0}).exec();
    },

    get6m : function(symbol_id) {
        return this.find({symbol_id: symbol_id, year:{$gte:(moment().year()-1)}}).lean().exec().then(function(data) {
            var res = data.sort(function(a,b) { return a.year - b.year;}).reduce(function(total, val) { return total.concat(val.history) }, []);
            return res.slice(-130);
        }).then(function(data) {
            return data.sort(function(a,b) {return b.date- a.date;})
        })
    },

    getRecent : function(symbol_id) {
        return this.find({symbol_id: symbol_id, year:{$gte:(moment().year()-1)}}).exec().then(function(data) {
            var res = data.sort(function(a,b) { return a.year - b.year;}).reduce(function(total, val) { return total.concat(val.history) }, []);
            return res.slice(-20);
        }).then(function(data) {
            return data.sort(function(a,b) {return b.date- a.date;})
        })
    },

    updateData: function(data) {
        var self = this;
        var match = {
            symbol_id: data.symbol_id,
            year: data.year,
            'history.date': data.history[0].date
        };
        return this.update(match, {
            $set: { 
                'history.$': data.history[0],
            }
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
                var emptyObj = {
                    date: data.history[0].date,
                };
                return self.update({
                    symbol_id: data.symbol_id,
                    year: data.year,
                }, {
                    $push: { 'history': emptyObj },
                    $set: { updated_at: new Date() }
                }, { upsert: true }).exec().then(function() {
                    return self.update(match, {
                        $set: {
                            'history.$': data.history[0],
                        }
                    }).exec();
                }).then(function() {
                    return true;
                });
            }
        });
    }

};

module.exports = sheetSchema;
