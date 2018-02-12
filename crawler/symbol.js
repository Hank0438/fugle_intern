var mongoose = require('mongoose'),
    Promise = require('bluebird'),
    database = require('./model/PTT_without_logtable');
    pttCrawler = database.pttCrawler;
    crawler = database.crawler;

//clear all symbol    
var clearSymbol = function(){
	pttCrawler.update({}, {$set : {symbol_id: [] } }, {multi: true}).exec()
	          .then(function(){
	              console.log("symbol is clear");
	          });
	return;
};
//update certain symbol
var updateSymbol = function(before, after){
    pttCrawler.update({symbol_id : before }, {$set : {"symbol_id.$": after } }, {multi: true}).exec()
	          .then(function(){
	              console.log("symbol_id : " + before + " is updated to " + after);
	          });
	return;
};
//add new symbol
//title or content
// var addSymbol = function(reg, symbol){
// 	pttCrawler.update({$or : [{"title": {$regex: reg} }, {"content": {$regex: reg} }]}, {$addToSet : {symbol_id : symbol } }, {multi: true}).exec()
// 	          .then(function(){
// 	              console.log("symbol_id : " + symbol + " is added");
// 	          });
// 	return;
// };
var addSymbol = function(reg, symbol){
	pttCrawler.update({"title": {$regex: reg} }, {$addToSet : {symbol_id : symbol } }, {multi: true}).exec()
	          .then(function(){
	              console.log("symbol_id : " + symbol + " is added");
	          });
	return;
};
//delete certain symbol
var deleteSymbol = function(symbol){
    pttCrawler.update({}, {$pull : {symbol_id : symbol } }, {multi: true}).exec()
	          .then(function(){
	              console.log("symbol_id : " + symbol + " is deleted");
	          });
	return;
}; 

var internAddSymbol = function(symbol){
    if(symbol === "一"){
		pttCrawler.update({"title":/2[0-5](歲|y)+/,"board":"CFP","symbol_id":"理財"},
	        {$addToSet : {symbol_id : symbol } }, {multi: true}).exec().then(function(){
	              console.log("symbol_id : " + symbol + " is added");
	        });
	    return;
	}
	else if(symbol === "二"){
		pttCrawler.update({"title":/((2[6-9])|(30))(歲|y)+/,"board":"CFP","symbol_id":"理財"},
	        {$addToSet : {symbol_id : symbol } }, {multi: true}).exec().then(function(){
	              console.log("symbol_id : " + symbol + " is added");
	        });
	    return;
    }
	else if(symbol === "三"){
		pttCrawler.update({"title":/3[1-5](歲|y)+/,"board":"CFP","symbol_id":"理財"},
	        {$addToSet : {symbol_id : symbol } }, {multi: true}).exec().then(function(){
	              console.log("symbol_id : " + symbol + " is added");
	        });
	    return;
	}
	else if(symbol === "四"){
		pttCrawler.update({"title":/((3[6-9])|(40))(歲|y)+/,"board":"CFP","symbol_id":"理財"},
	        {$addToSet : {symbol_id : symbol } }, {multi: true}).exec().then(function(){
	              console.log("symbol_id : " + symbol + " is added");
	        });
	    return;
	}
};

var internCheckSymbol = function(symbol){
	pttCrawler.find({"board":"CFP","symbol_id":symbol}).exec().then(function(crawler){        
		for (var i = 0; i < crawler.length; i++) {
			console.log("===================NO."+ i+"====================")
			var date = new Date(Date.parse(crawler[i].publishedDate))
			console.log("Date : "+date);
			console.log("Author : "+crawler[i].author);
			console.log("Title : "+crawler[i].title);
			console.log("Content : "+crawler[i].content);
			for (var j= 0; j< crawler[i].comment.length; j++) {
				console.log(crawler[i].comment[j].name+ ":"+ crawler[i].comment[j].words);
			}
		}
	});
	return;
};

//command input
var action = process.argv[2];


//choose action
if(action === "clear"){
	clearSymbol();
}
else if(action === "update"){
	updateSymbol(process.argv[3], process.argv[4]);
}
else if(action === "add"){
	var reg = new RegExp(process.argv[3],"i");
	addSymbol(reg, process.argv[4]);
}
else if(action === "delete"){
	deleteSymbol(process.argv[3]);
}
else if(action === "intern"){
	internAddSymbol(process.argv[3]);
}
else if(action === "internCheck"){
	internCheckSymbol(process.argv[3]);
}
else{
	console.log("action is wrong");
}

