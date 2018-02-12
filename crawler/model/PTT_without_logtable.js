var GeneralErrors = require('../errors/GeneralErrors');
var mongoose = require('mongoose');

//connect db
mongoose.connect('mongodb://git.fugle.tw:27017/internship');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));


var comment_schema = mongoose.Schema({
        express: String,
        name: {type: String, index: true},
        words: String,
        time: String,
        commentIp: {type: String, index: true}
},{ _id : false });


var Schema = mongoose.Schema({
        author: {type: String, index: true},
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

var crawler = mongoose.model('crawler', crawler_schema, 'crawler');
var pttCrawler = mongoose.model('pttCrawler', Schema, "pttCrawler_demo");



module.exports = {pttCrawler, crawler};