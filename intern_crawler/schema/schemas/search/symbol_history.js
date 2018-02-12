/**
 * Created by bistin on 2014/8/8.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');

var SymbolHistory = new Schema({
    symbol_id: {type: String},
    category: {type: String},       // stock, etf, index, stock-group, commodity...
    name: {type: String},
    aliases: [{type: String}],
    market: {type: String},         // tw.tse, tw.otc, tw.emg, tw.etf, tw.index, tw.concept, tw.gisa, tw.public, tw.non-public...
    industry: {type: String},
    on_date: {type: Date},
    off_date: {type: Date},
    year: { type: Number },
    date: [String]
},  { collection : 'symbol_history' })

SymbolHistory.index({symbol_id: 1, year: 1, off_date: 1, date: -1}, {unique: true});

SymbolHistory.statics = {
    updateData: function(data){
        var date = moment().format('YYYYMMDD');
        return Promise.resolve(
            this.update(data, {
                $addToSet: {'date': date},
            }, {upsert:true}).exec()
        ).catch(function(err){
            if(err.code !== 11000){
                throw err;
            }
        });
    }
};

module.exports = SymbolHistory;
