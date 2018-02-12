var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');
var _ = require('underscore');

var StatementSchema = new Schema({
    symbol_id : String,
    year      : Number,
    season    : Number,
    period    : String,         // 會計base時間: 季度, 半年度
    accu      : Boolean,        // 累計(True)/單季(False)
    merge     : Boolean,        // 合併(True)/個別(False)
    ifres     : Boolean,
    currency  : String,
    data      : [{
        _id : false,
        code : String,
        value : Number
    }]
}, { collection: 'statement' });

StatementSchema.index({symbol_id: 1, year: -1, season: -1, period: 1, accu: 1, merge: 1}, {unique: true});
StatementSchema.index({symbol_id: 1, year: -1, season: -1, 'data.code':1});
StatementSchema.index({symbol_id: 1, 'data.code':1});

StatementSchema.statics = {
    updateData: function(row){
        return this.update({
            symbol_id: row.symbol_id,
            year: row.year,
            season: row.season,
            period: row.period,
            accu: row.accu,
            merge: row.merge
        }, {
            $set: {
                ifres: row.ifres,
                currency: row.currency,
            },
            $addToSet: {
                data: { $each: row.data }
            }
        }, { upsert: true }).exec();
    }
};

module.exports = StatementSchema;
