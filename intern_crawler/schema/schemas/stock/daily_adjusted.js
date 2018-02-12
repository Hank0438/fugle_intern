var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');
var _ = require('underscore');

var Histories = new Schema({
    date: Date,
    open: Number,
    high: Number,
    low:  Number,
    close: Number,
    volume: Number,         // 成交量(千股)
    amount: Number,         // 成交值(千元)
    roi: Number,            // 報酬率％
    turnover: Number,       // 週轉率％
    outstanding: Number,    // 流通在外股數(千股)
    mv: Number,             // 市值(百萬元) 
    bid: Number,
    offer: Number,
    mv_rate: Number,
    amt_rate: Number,
    transactions: Number,   // 成交筆數
    per: Number,            // 本益比
    pbr: Number,            // 股價淨值比
    limit: String,
    change: Number,
    xattn1: String,
    xattn2: String,
    xstat1: String
},{
    _id: false
});

var DailyAdjustedSchema = new Schema({
    symbol_id: { type: String },
    year:      { type: Number },
    history:  [Histories],
}, {     
    versionKey: false,
    collection : 'daily_adjusted' 
});

DailyAdjustedSchema.index({symbol_id: 1, year: -1}, {unique: true});

DailyAdjustedSchema.statics = {
    updateData: function(symbol_id, row){
        var self = this;
        return this.update({
            symbol_id: symbol_id,
            year : moment(row.date).year(),
            'history.date': row.date
        },{
            $set: { 'history.$': row }
        }).exec().then(function(response){
            if(response.n > 0) return;
            return self.update({
                symbol_id: symbol_id,
                year : moment(row.date).year(),
            },{
                $push: { 'history': row }
            },{ upsert: true }).exec();
        });
    }
};

module.exports = DailyAdjustedSchema;
