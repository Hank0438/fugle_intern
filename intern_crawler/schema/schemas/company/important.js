/**
 * Created by bistin on 2014/8/8.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var updatedPlugin = require('../../plugins/updated_new');

var ImportantSchema = new Schema({
    symbol_id : { type: String },
    name : { type: String },
    timestamp : {type : Date},
    title : {type:String},
    pathoptions : {},
    detail:  []
},  { collection : 'important' })

ImportantSchema.pre('save', function(next) {
    if (this.isNew && 0 === this.detail.length) {
        this.detail = undefined;
    }
    next();
});

ImportantSchema.plugin(updatedPlugin);
ImportantSchema.index({symbol_id: 1, timestamp:-1},{unique: true});
ImportantSchema.index({timestamp:-1});

ImportantSchema.statics = {
    get : function(symbol_id) {
        if(symbol_id == 'all') {
            return this.find({},{_id:0}).sort({timestamp:-1}).limit(10).exec().then(function(data) {
                return data.map(function(row) {return row.toObject()});
            });    
        }else{
            return this.find({symbol_id: symbol_id},{_id:0}).sort({timestamp:-1}).limit(10).exec().then(function(data) {
                return data.map(function(row) {return row.toObject()});
            });     
        }
        
    },

    getAll : function(symbol_id) {
        return this.find({symbol_id: symbol_id},{_id:0}).sort({timestamp:-1}).exec().then(function(data) {
            return data;
        });
    },

    updateDetail : function(res, detail) {
        var self = this;
        var match = {
            _id: res._id 
        };
        return Promise.resolve(
            this.update(match, {
                $set: { detail : detail },
                $unset: { pathoptions: '' }
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
    },

    getNewMess :function(time) {
        return this.find({timestamp:{$gte :time} ,'detail': {$exists : false}}).exec();
    }

};

module.exports = ImportantSchema;
