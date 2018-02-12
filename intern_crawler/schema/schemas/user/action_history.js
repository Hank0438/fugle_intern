var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('lodash');

/*
 * CATEGORY: ACTIONS
 * ---------------------
 * watchlist: create, addSymbol, removeSymbol, delete
 * card: open[By...], drop
 * query: textSearch, hotLink, watchlistBar, watchlistPage, groupRecommend, globalRecommend
 *
 */
var Card = new Schema({
    symbol_id: String,
    type: String,
    filter: String
},{
    _id: false
});

var ActionHistory = new Schema({
    timestamp: Date,
    email: String,
    ip: String,
    category: String,     // query, watchlist, card, ...
    action: String,       // textSearch, addSymbol, removeSymbol, ...
    cards: [Card],        // involved cards
    detail: {}
}, {
    versionKey: false,
    collection: 'action_history'
});

ActionHistory.index({ email: 1, timestamp: -1, category: 1, action: 1 });
ActionHistory.index({ timestamp: -1, category: 1, action: 1 });
ActionHistory.index({ category: 1 });
ActionHistory.index({ action: 1 });

ActionHistory.statics = {
    log: function(user, ip, logData){
        var email = (user)? user.email : '';
        return this.create({
            timestamp: moment().toDate(),
            email: email,
            ip: ip,
            category: logData.category,
            action: logData.action,
            cards: logData.cards,
            detail: logData.detail
        });
    }
};

module.exports = ActionHistory;
