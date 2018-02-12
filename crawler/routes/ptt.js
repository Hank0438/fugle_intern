var express  = require('express');
    mongoose = require( 'mongoose' ),
     Promise = require('bluebird'),
    router   = express.Router(),
    database = require('../model/PTT'),
    pttCrawler = database.pttCrawler,
    crawler = database.crawler,
    perPage = 20,
    count = 0;

//get all ptt
router.get('/', function(req, res) {
  var query = {};
  var type = [];
  if(req.query.board){
      query.board = req.query.board;
      var obj = {
          type : "board",
          string : req.query.board
      };
      type.push(obj);
  };
  if(req.query.author){
      query.author = req.query.author;
      var obj = {
          type : "author",
          string : req.query.author
      };
      type.push(obj);
  };
  if(req.query.ip){
      query.ip = req.query.ip;
      var obj = {
          type : "ip",
          string : req.query.ip
      };
      type.push(obj);
  };
  if(req.query.title){
     var r1 = new RegExp(req.query.title,"i");
     query.title = {$regex: r1};
     var obj = {
          type : "title",
          string : req.query.title
      };
      type.push(obj);
  }
  if(req.query.content){
    var r2 = new RegExp(req.query.content,"i");
    query.content = {$regex: r2};
    var obj = {
          type : "content",
          string : req.query.content
      };
      type.push(obj);
  }
  if(req.query.words){
    var r3 = new RegExp(req.query.words,"i");
    query.comment = { $elemMatch: { "words": { $regex: r3 }} };
    var obj = {
          type : "words",
          string : req.query.words
      };
      type.push(obj);
  }
  if(req.query.symbol){
      query.symbol_id = req.query.symbol;
      var obj = {
          type : "symbol",
          string : req.query.symbol
      };
      type.push(obj);
  };
  pttCrawler.find( query ).count().exec().then(function(count){
    this.count = count;
    return;
  }).then(
    pttCrawler.find( query ).sort({"publishedDate":-1}).limit(perPage).skip(perPage *req.query.page)
        .exec().then(function(crawlers){
          count += crawlers.length;
          res.render('pttTable', {
            title : 'PTT CRAWLER',
            type : type,
            ptt : crawlers,
            page : req.query.page,
            end : Math.floor(count/perPage)
          });
          return;
    }).then(function(){
        console.log("resssssssss");
        console.log(type);
    })
  );
});

module.exports = router;
