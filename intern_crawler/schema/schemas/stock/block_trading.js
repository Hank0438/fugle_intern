/**
 * Created by bistin on 2014/8/20.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var sheetSchema = new Schema({
    date      : Date,
    symbol_id : String,
    name      : String,
    type      : String,
    settlementDate : String,
    price     : String,
    volume    : Number,
    value     : Number,
    numStock  : Number,
    time :  String,
    rec_symbol_id : String,
    rec_name : String,
    contains     :
        [{  _id:false ,
            symbol_id : String,
            name      : String,
            price     : String,
            volume    : Number,
            value     : Number,
        }]
}, { collection : 'blockTrading' });

sheetSchema.plugin(updatedPlugin);
sheetSchema.index({symbol_id: 1, date:-1});
sheetSchema.index({date:-1});
sheetSchema.index({
    'contains.symbol_id' : 1,
    'date' : -1
});

sheetSchema.pre('save', function(next) {
    if (this.isNew && 0 === this.contains.length) {
        this.contains = undefined;
    }
    next();
});


sheetSchema.statics = {

    get : function(symbol_id) {
        return this.find({symbol_id: symbol_id},{_id:0,__v:0}).exec().then(function(data) {
            return data.slice(0,10);
        });
    },

    get2 : function(symbol_id) {
        return this.find({$or: [{symbol_id: symbol_id},{'contains.symbol_id':symbol_id}] },{_id:0,__v:0})
            .sort({date:-1})
            .limit(100)
            .exec();
    },

    updateData : function(data) {
        var self = this;
        var match = data;
        return Promise.resolve(
            this.update(match, data, { upsert: true }).exec()
        ).then(function(result) {
            if (result.nModified !== 0 || result.upserted) {
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

    createP : function(data) {
        return Promise.promisify(this.create,this)(data);
    }
}

module.exports = sheetSchema;
