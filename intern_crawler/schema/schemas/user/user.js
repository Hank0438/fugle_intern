var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;
var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');

var ExternalToken = new Schema({
    type   : { type: String },
    id     : { type: String },
    name   : { type: String },
},{
    _id: false
});

var CardStat = new Schema({
    card_spec_id: { type: String },
    open_score:   { type: Number },
},{
    _id: false
});

var User = new Schema({
    email           : { type: String },
    external_tokens : [ExternalToken],
    username        : { type: String }, // should be used like nickname 
    password        : { type: String }, // for simple-auth
    card_stats      : [CardStat],
    is_admin        : { type: Boolean, default: false },
    created         : { type: Date, default: moment().toDate() }
});

User.index({ email: 1 }, { unique: true });

User.statics = {
}

//Password verification
User.methods.comparePassword = function(password, cb) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(isMatch);
    });
};

module.exports = User;
