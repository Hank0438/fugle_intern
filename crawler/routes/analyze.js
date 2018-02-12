var express  = require('express');
var mongoose = require( 'mongoose' );
var router   = express.Router();
var PTT = require('../model/PTT');
var pttCrawler = PTT.pttCrawler;
var crawler = PTT.crawler;


router.get('/', function(req, res) {
	var pttBNum = [];
	var ptt = [];
	var mgr = [];
    crawler.find({}).exec().then(function(craw){
            mgr = craw;
            for(var i= 0; i< craw.length; i++){
               pttCrawler.find({'board' : craw[i].board_name}).exec().then(function(crawlers){
                  console.log(crawlers.length)
                  pttBNum.append(crawlers.length);
                  return;
               });
            }; 
            return;
         }).then(function(){
            console.log('nananana');
    
    console.log( pttBNum);
    res.render('analyze', {
        pttBNum : pttBNum,
        mgr : mgr,
        title : 'Analyze'
    });
    //res.sendStatus(200);
});
});
module.exports = router;
