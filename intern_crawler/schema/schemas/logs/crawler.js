var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var Crawler = new Schema({
    timestamp: { type: Date },
    message: { type: String },
    level: { type: String },
    meta: { type: Schema.Types.Mixed }
}, {
    versionKey: false,
    collection: 'crawler'
});

Crawler.index({ timestamp: -1 });
Crawler.index({ 'meta.crawler': 1 });
Crawler.index({ 'meta.fingerprint': 1 });

Crawler.statics = {
}

module.exports = Crawler;
