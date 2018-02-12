/**
 * Created by bistin on 2014/8/11.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var updatedPlugin = require('../../plugins/updated_new');

var data = new Schema({
    _id: false,
    range_start  : { type: Number },
    range_end    : { type: Number },
    range_string : { type: String },
    people       : { type: Number },
    shares       : { type: Number },
    proportion   : { type: Number }
});

var sheetSchema = new Schema({
    symbol_id : { type: String },
    date      : { type: Date },
    data      : [data]
}, { collection: 'tdcc_distribution' });

sheetSchema.index({ symbol_id: 1, date: -1 }, { unique: true });
sheetSchema.index({ date: 1 });
sheetSchema.plugin(updatedPlugin);

sheetSchema.statics = {
    get : function(symbolId) {
        return this.find({symbol_id: symbolId}, {_id: 0}).exec();
    },

    updateData: function(row) {
        var self = this;
        var match = {
            symbol_id: row.symbol_id, 
            date: row.date
        };
        return Promise.resolve(
            this.update(match, {
                $set: {
                    data: row.data
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

module.exports = sheetSchema;
