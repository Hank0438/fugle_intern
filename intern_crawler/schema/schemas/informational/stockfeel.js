var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');
var Schema = mongoose.Schema;

var StockfeelSchema = new Schema({
    url:            { type: String },
    timestamp:      { type: Date },
    title:          { type: String },
    author:         { type: String },
    content:        { type: String },
    html_content:   { type: String },
    image:          { type: String },
    symbol_ids:     [{ type: String }],
    tags:           [{ type: String }],
},  {
    collection : 'stockfeel',
});

StockfeelSchema.plugin(updatedPlugin);
StockfeelSchema.index({url: 1}, {unique: true});
StockfeelSchema.index({timestamp: -1});
StockfeelSchema.index({symbol_ids: 1, timestamp: -1});

StockfeelSchema.statics = {

    updateData: function(row) {
        var self = this;
        return Promise.resolve(
            this.update({
                url: row.url,
            }, row, {upsert: true}).exec()
        ).then(function(result) {
            if (result.nModified !== 0 || result.upserted) {
                return self.update({
                    url: row.url,
                }, {
                    updated_at: new Date()
                }).exec().then(function() {
                    return true;
                });
            } else {
                return false;
            }
        });
    },

};

module.exports = StockfeelSchema;
