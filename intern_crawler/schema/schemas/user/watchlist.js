/**
 * Created by bistin on 2014/12/29.
 */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Promise = require('bluebird');

var Watchlist = new Schema({
    email : String,
    title : String,
    lists : Array,
    resources : Array
}, {collection : 'watchlist'});

Watchlist.index( {email: 1}, {unique: true} );

Watchlist.statics = {
    findByEmail : function(email){
        return Promise.cast(this.find({
            email: email
        },{__v:0, email:0}).exec());
    }
};

module.exports = Watchlist;
