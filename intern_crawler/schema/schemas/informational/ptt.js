var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');
var Schema = mongoose.Schema;

var commentSchema = new Schema({
    expression: { type: String },
    user_id: { type: String },
    words: { type: String },
    timestamp: { type: Date },
}, { _id : false });

var PttSchema = new Schema({
    article_id: { type: String },
    user_id: { type: String },
    user_name: { type: String },
    title: { type: String },
    timestamp:  {type: Date },
    board: { type: String },
    url: { type: String },
    ip: { type: String },
    content: { type: String },
    comments: [commentSchema],
    symbol_ids: [{ type: String }]
},  {
    collection : 'ptt',
});

PttSchema.plugin(updatedPlugin);
PttSchema.index({article_id: 1}, {unique: true});
PttSchema.index({user_id: -1});
PttSchema.index({timestamp: -1});
PttSchema.index({board: -1});
PttSchema.index({ip: -1});
PttSchema.index({symbol_ids: -1});

PttSchema.statics = {

    updateData: function(row) {
        var self = this;
        var match = {
            article_id: row.article_id
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

module.exports = PttSchema;
