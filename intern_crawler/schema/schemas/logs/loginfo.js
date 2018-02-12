/**
 * Created by bistin on 2014/8/8.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');

var Loginfo = new Schema({
    timestamp: Date,
    message: String,
    title: String,
    level: Number,
    args: {},
    file: String,
    pos: String,
    line: String,
    path: String,
    method: String,
    stack: String,
    output: String
}, {
    versionKey: false,
    collection: 'loginfo'
});

Loginfo.index({ timestamp: -1 });

Loginfo.statics = {
}

module.exports = Loginfo;
