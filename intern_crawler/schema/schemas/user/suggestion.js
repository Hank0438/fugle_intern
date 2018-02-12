var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('lodash');

var Suggestion = new Schema({
    timestamp: Date,
    username: String,
    email: String,
    suggestion: String
}, {
    versionKey: false,
    collection: 'suggestion'
});

Suggestion.index({ timestamp: 1, email: 1 });

Suggestion.statics = {
    updateData: function(username, email, suggestion){
        return this.create({
            timestamp: moment().toDate(),
            username: username,
            email: email,
            suggestion: suggestion
        });
    }
};

module.exports = Suggestion;
