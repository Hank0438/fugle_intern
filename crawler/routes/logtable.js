var express  = require('express');
var mongoose = require( 'mongoose' );
var router   = express.Router();
var PTT = require('../model/PTT');
var pttCrawler = PTT.pttCrawler;
var crawler = PTT.crawler;
var logTable = PTT.logTable;

router.get('/', function(req, res) {
	var page = 1;
	if(req.query.page){
		page = parseInt(req.query.page);
		if (page < 1) page = 1;
	}
	console.log(page)
	var total_logs = 0;
	logTable.find({}).count().exec().then(function(count){
		total_logs = count;
		if (page > Math.floor((total_logs-1)/20) +1 )  page = Math.floor((total_logs-1)/20) +1;
		console.log(total_logs);
		console.log(Math.floor((total_logs-1)/20) +1);
		return;
	}).then(function(){
		logTable.find({}).sort({"last_updatetime":-1}).limit(20).skip(20 * (page-1)).exec().then(function(result){
			res.render('logTable', {
				title : 'Crawlers log',
				logtable : result,
				page : page,
				last_page : Math.floor((total_logs-1)/20) +1,
				total_logs : total_logs
			  	});
			return;
		});
	});
});

module.exports = router;
