var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Promise = require('bluebird');
var _ = require('lodash');

var MessageStorage = new Schema({
    date:  { type: Date },
    type:  { type: String }, // version-update, data-update, maintenance...
    title: { type: String },
    msg:   { type: String }
}, { 
    collection : 'message_storage'
});

MessageStorage.index({date: 1, title: 1}, {unique: true});

MessageStorage.statics = {
};

module.exports = MessageStorage;
