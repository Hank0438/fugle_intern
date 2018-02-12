var GeneralErrors = require('../errors/GeneralErrors');
var mongoose = require('mongoose');
var db = require('../app');

var comment_schema = mongoose.Schema({
        express: String,
        name: {type: String, index: true},
        words: String,
        time: String,
        commentIp: {type: String, index: true}
},{ _id : false });


var ptt_schema = mongoose.Schema({
        article_id: {type: String, unique: true},
        author: {type: String, index: true},
        nickname : String, 
        title: String,
        publishedDate: {type: String, index: true},
        board: {type: String, index: true},
        link: String,
        ip: {type: String, index: true},
        likeCount: Number,
        content: String,
        comment: [comment_schema],
        symbol_id: []
});

var crawler_schema = mongoose.Schema({
        board_name: {type: String, index: true},
        setting : {limit_type : String, limit_number : Number},
        status : String,
        current : String,
        last_updatetime : String,
        last_update : String,
        create_time : String,
        frequency : String
});

var logtable_schema = mongoose.Schema({
        board_name: {type: String, index: true},
        setting : {limit_type : String, limit_number : Number},
        last_updatetime : String,
        last_update : String,
        info : String
});


var crawler = mongoose.model('crawler', crawler_schema, 'crawler');
var pttCrawler = mongoose.model('pttCrawler', ptt_schema, "pttCrawler_demo");
var logTable = mongoose.model('logTable', logtable_schema, "logTable");

module.exports = {pttCrawler, crawler, logTable};
