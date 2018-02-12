/**
 * Created by bistin on 2014/8/8.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var ChairSchema = new Schema({
    symbol_id: String,
    year: Number,
    month: Number,
    data: [
        {
            _id: false,
            position: String,
            name: String,
            electedSH: Number,
            currentSH: Number,
            pledge: Number,
            pledgeRt: Number,
            relationSH: Number,
            relationPledge: Number,
            relationPledgeRt: Number
        }
    ]
},  { collection : 'chair' });

ChairSchema.plugin(updatedPlugin);
ChairSchema.index({symbol_id: 1, year: -1, month: -1}, {unique: true});

ChairSchema.statics = {
    updateData: function(row){
        var self = this;
        var match = {
            symbol_id: row.symbol_id,
            year: row.year,
            month: row.month
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
};

module.exports = ChairSchema;
