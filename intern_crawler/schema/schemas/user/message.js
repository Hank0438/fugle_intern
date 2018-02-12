var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');

var Message = new Schema({
    email           : { type: String },
    date            : { type: Date },
    storage_id      : { type: Schema.Types.ObjectId }, // link to message_storage msg
    is_read         : { type: Boolean, default: false },
    read_datetime   : { type: Date },
}, { 
    collection : 'message'
});

Message.index({ email: 1, date: -1 });
Message.index({ email: 1, is_read: 1 });
Message.index({ storage_id: 1 });

Message.statics = {
};

module.exports = Message;
