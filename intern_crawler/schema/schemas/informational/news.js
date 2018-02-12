var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var Schema = mongoose.Schema;

var ImageObj = new Schema({
  url: String,
  desc: String
},{
  _id: false
});

var NewsSchema = new Schema({
    id: { type: String },                // need a id to prevent from duplicated insert ( website news can use url hash )
    timestamp: { type: Date },
    source: { type: String },
    type: { type: String},
    url: { type: String },
    title: { type: String },
    subtitle: { type: String },          // subtitle...lol
    content: { type: String },
    images: [ImageObj],
    videos: [ImageObj],
    rawHTML : { type: String },
    raw_symbol_ids: [{ type: String }],
    symbol_ids: [{ type: String }]
},  {
    collection : 'news',
});

NewsSchema.plugin(updatedPlugin);
NewsSchema.index({title: 1}, {unique: true});
NewsSchema.index({timestamp: -1});
NewsSchema.index({symbol_ids: 1, timestamp: -1});

NewsSchema.statics = {

    getLastNDay : function(n) {
        var startTimestamp = moment().startOf('day').add(-n, 'days').toDate();
        return this.find({timestamp: {$gte: startTimestamp}})
            .sort({timestamp: -1, id: -1})
            .exec();
    },

    updateData : function(row) {
        var self = this;
        var match = {
            title: row.title
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

module.exports = NewsSchema;
