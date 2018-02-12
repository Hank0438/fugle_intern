// npm install request cheerio json2csv moment
var fs = require('fs'),
    request = require('request'),
    request_promise = require('request-promise'),
    cheerio = require('cheerio'),
    json2csv = require('json2csv'),
    moment = require('moment'),
    mongoose = require('mongoose'),
    Promise = require('bluebird');
var HOST = 'https://www.ptt.cc';



// schema 
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
        updateTime: String,
        board: String,
        link: String,
        likeCount: Number,
        content: String,
        comment: [commentSchema]
});


// mongoose connection
mongoose.connect('mongodb://git.fugle.tw:27017/trySth');

var pttCrawler = mongoose.model('pttCrawler', Schema, "pttCrawler_demo");
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// PART1:只是宣告，將每個index的連結寫入links，直到到預設的index被讀取

var getMenu = function (url, setting, links, titles) {
    // for over-18 test
    var cookie = request.cookie('over18=1');
    var j = request.jar();
    j.setCookie(cookie, url);
    // request url with cookie
    return request_promise({url: url, jar: j}).then(function (body) {    
        var lastPage = '',
            stop = 0;
        // Transform source to DOM object
        var $ = cheerio.load(body);
        //對於每一個標籤做處理
        // if index.html, ignore bottom articles
        var div_list = (url.slice(-11) == '/index.html') ? $('div.r-list-sep').prevAll() : $('div.r-ent');
        div_list.each(function (i, e){
            if($(e).find('a').attr('href') != undefined){
                var day = moment().format('YYYY') + '-';
                day = day + $(e).find('div.meta > div.date').text().replace('/', '-').replace(' ', '0');
                if (setting.limit_type == 'day' && day == moment().subtract(setting.limit_number, 'days').format('YYYY-MM-DD')) {
                    stop = 1;
                }
                else {
                    //console.log($(e).find('a').attr('href'));   // print article name
                    links.push($(e).find('a').attr('href'));
                    titles.push($(e).find('a').text());
                }
            }
        });
        // Try to get the next page
        lastPage = $('a.wide:nth-child(2)').attr('href');
        if (setting.limit_type == 'page'){
            setting.limit_number--;
            if (setting.limit_number == 0) stop = 1;
        }
        if (stop == 0) {
            // Pass this state as the beginning state in the next round.
            return getMenu(HOST + lastPage, setting, links, titles);
        }else {
            var arr = [];
            for (var i = 0; i < links.length; i++) {
                var obj = {
                    title : titles[i],
                    link : links[i]
                }
                arr.push(obj);
            }
            console.log(arr);
            return [arr,links,titles];
        }
    });
};


//PART2:只是宣告，將內文從每篇連結的article寫入contents
var getOneArticle = function(obj){
    var url =  HOST + obj.link;
    var cookie = request.cookie('over18=1');
    var j = request.jar();
    j.setCookie(cookie, url);
    console.log("GOAT : "+obj.title);
    return request_promise({url:url, jar: j}).then(function (body) {
        console.log('fetching '+ url + ' ...');
        // Transform source to DOM object
        var $ = cheerio.load(body);
        // 抓推+噓文的部分
        var c = [];
        for(i = 0; i < $(".push-tag").length ; i++){
            result = {
                express : $(".push-tag").eq(i).text(),
                name : $(".push-userid").eq(i).text(),
                words : $(".push-content").eq(i).text(),
                time : $(".push-ipdatetime").eq(i).text()
            };
            c.push(result);
        };
        //get title
        var title = $('span.article-meta-value').eq(-2).text();
        if(title === undefined){
            title = obj.title;
        }
        // fetch article information
        var article = {
            author : $('div.article-metaline:nth-child(1) > span:nth-child(2)').text(),
            title : title,
            publishedDate : $('span.article-meta-value').eq(-1).text(),
            board: $('a.board').find('span.board-label').remove().end().text().slice(0,-4),
            link : url,
            likeCount : $('.push-tag').not('.f1').length,
            content : $('#main-content').find('.article-metaline').remove().end()
                                .find('.article-metaline-right').remove().end()
                                .find('span[class="f2"]').remove().end()
                                .find('.push').remove().end()
                                .text(),
            comment : c
        };
        return article;
    });
}



var getArticle = function (arr) {
    return Promise.map(arr, function(obj){
        return Promise.delay(500).then(function(){
            return getOneArticle(obj);  
        })        
    }, {concurrency : 1})
};

var writeDB = function (contents){
    return pttCrawler.create(contents);
};

// export module
module.exports = {
    start : function(board_name, limit_type, limit_number, callback){
        var setting = {
            board_name : board_name,
            limit_type : limit_type,
            limit_number : limit_number,
        };
        var settingstring = setting.board_name + '_' + setting.limit_type + '_' + setting.limit_number.toString();
        var url = HOST + '/bbs/' + board_name + '/index.html';
        var filename = './logfile/' + moment().format('YYYY_MM_DD_HH_mm_ss') + '_' + settingstring + '.json';
        
        return getMenu(url, setting, [], []).then( function(array){
            var arr = array[0];
            var links = array[1];
            var titles = array[2];
            console.log("links : "+links);
            console.log("titles : "+titles);

            console.log(settingstring + ' total # of articles: ' + links.length);
            return getArticle(arr).then(function(contents){
                console.log(settingstring + ' : fetching contents done');
                return writeDB(contents);
            });
        });
    }
}




if (require.main === module) { 
    module.exports.start("NBA", "page", 1, function(data){
        console.log(data)
    }).then(function(){
        mongoose.disconnect()
    })
}