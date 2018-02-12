var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var Schema = mongoose.Schema;

var updatedPlugin = require('../../plugins/updated_new');

var UrlSchema = new Schema({
    type: { type: String },
    url:  { type: String }
}, { _id: 0 });

var IfrsUrlSchema = new Schema({
    symbol_id: { type: String },
    year:      { type: Number },
    season:    { type: Number },
    urls:      [UrlSchema],
},  {
    collection: 'mops_ifrs_url',
});

IfrsUrlSchema.plugin(updatedPlugin);
IfrsUrlSchema.index({symbol_id: 1, year: -1, season: -1}, {unique: true});

IfrsUrlSchema.statics = {

    getLastest: function(symbolId) {
        return Promise.resolve(
            this.find({
                symbol_id: symbolId,
            }, {
                _id: 0
            }).sort({
                year: -1,
                season: -1
            }).limit(1).lean().exec()
        ).then(function(results) {
            return results.length ? results[0] : null;
        });
    },

    updateData: function(row) {
        var self = this;
        var match = {
            symbol_id: row.symbol_id,
            year: row.year,
            season: row.season,
        };
        return Promise.resolve(
            this.update(match, row, { upsert: true }).exec()
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
    },

};

module.exports = IfrsUrlSchema;
