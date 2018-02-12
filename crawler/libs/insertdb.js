var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
var dbHost = 'mongodb://git.fugle.tw:27017/try';

mongoose.connect(dbHost);
//Create a schema for PTT-crawler
var commentSchema = mongoose.Schema({
        express: String,
        name: {type: String, index: true},
        words: String,
        time: String
},{ _id : false });

var Schema = mongoose.Schema({
        author: {type: String, index: true},
        title: String,
        publishedDate: String,
        board: String,
        likeCount: Number,
        content: String,
        comment: [commentSchema]
});


var pttCrawler = mongoose.model('pttCrawler', Schema, "pttCrawler_demo");

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

    /*{
        "author": "wickwolf (呆狼)",
        "title": "[閒聊] 2016/07/14 盤後閒聊",
        "publishedDate": "Thu Jul 14 14:00:00 2016",
        "board": "Stock",
        "likeCount": 0,
        "content": "",
        "comment": [{exress : "", name: "", words: "", time : ""},
                    {exress : "", name: "", words: "", time : ""},
                    {exress : "", name: "", words: "", time : ""}]
    }*/
var c ={};
fs.readFile('C:/Users/USER/Desktop/crawler/keyword_test.json',function(err, data){
  if(err){
    throw err;
  }
  // console.log(data.toString());
  c = JSON.parse(data.toString());//將字串轉成Object
  

  db.once('open', function(callback){
    console.log("Connected to DB");
    var read = new pttCrawler;
    read.author = c.author;
    read.title = c.title;
    read.publishedDate = c.publishedDate;
    read.board = c.board;
    read.likeCount = c.likeCount;
    read.content = c.content;  
    for(var i=0; i<=c.comment.length-1; i++){
      read.comment.push(c.comment[i]);
    };
    read.save(callback);
  });
  console.log("Read Successfully");
  
});