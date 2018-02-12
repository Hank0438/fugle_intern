// npm install request cheerio json2csv moment
var fs = require('fs'),
    request = require('request'),
    cheerio = require('cheerio'),
    json2csv = require('json2csv'),
    moment = require('moment'),
    mongoose = require('mongoose');

var HOST = 'https://www.ptt.cc';

// PART1:只是宣告，將每個index的連結寫入links，直到到預設的index被讀取
var getMenu = function (url, setting, links, callback) {
    // for over-18 test
    var cookie = request.cookie('over18=1');
    var j = request.jar();
    j.setCookie(cookie, url);

    // request url with cookie
    request({url: url, jar: j}, function (err, res, body) {
        //如果都正確就執行
        if (!err && res.statusCode == 200) {
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
                getMenu(HOST + lastPage, setting, links, callback);
            }
            else {
                //done
                callback(links);
            }
        }
        else{
            console.log('request error: ' + url + ' ' + err);
            callback('error');
        }
    });
};


//PART2:只是宣告，將內文從每篇連結的article寫入contents
var getArticle = function (links, contents, callback) {
    var url = HOST + links[0];

    // for over 18 test
    var cookie = request.cookie('over18=1');
    var j = request.jar();
    j.setCookie(cookie, url);

    // request url with cookie
    request({url: url, jar: j} , function (err, res, body) {
        if (!err && res.statusCode === 200) {
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

            // fetch article information
            var article = {
                author : $('div.article-metaline:nth-child(1) > span:nth-child(2)').text(),
                title : $('div.article-metaline:nth-child(3) > span:nth-child(2)').text(),
                publishedDate : $('div.article-metaline:nth-child(4) > span:nth-child(2)').text(),
                board: $ ('.article-metaline-right > span:nth-child(2)').text(),
                link : url,
                likeCount : $('.push-tag').not('.f1').length,
                content : $('#main-content').find('.article-metaline').remove().end()
                                    .find('.article-metaline-right').remove().end()
                                    .find('span[class="f2"]').remove().end()
                                    .find('.push').remove().end()
                                    .text(),
                comment : c
            };

            contents.push(article);
            //提取字符串的某個部分，並以新的字符串返回被提取的部分, 每0.5秒抓一篇
            links = links.slice(1);
            console.log("remaining articles: "+ links.length);
            setTimeout(function() {
                getArticle(links, contents, callback);
            }, 500);

        }
        else {
            if (links[0] != undefined){
                console.log("stage2 error: "+err);
                callback('error');
            }
            else{
                callback(contents);
            }
        }
    });
};

var writeDB = function (contents, callback){
    //console.log('prepare to write db: ' + contents);
    //return callback();

    mongoose.connect('mongodb://git.fugle.tw:27017/trySth');

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
    var pttCrawler = mongoose.model('pttCrawler', Schema, "pttCrawler_demo");
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', function(){
        //console.log("Content DB connection open: start to save");
        for(var n = 0; n < contents.length; n++){
            var com = [];
            //console.log(n+"篇");
            for(var i = 0; i < contents[n].comment.length; i++){
                com.push(contents[n].comment[i]);
                //console.log("推文數/篇:"+i+"/"+n);
            };

            var read = new pttCrawler({
                author:        contents[n].author,
                title:         contents[n].title,
                publishedDate: contents[n].publishedDate,
                updateTime:    contents[n].publishedDate,
                board:         contents[n].board,
                link:          contents[n].link,
                likeCount:     contents[n].likeCount,
                content:       contents[n].content,
                comment:       com
            });
            read.save(function(err, document_name, row_affected){
                if ( err ) throw err;
            });
        }
        //mongoose.connection.close();
        //console.log('Content DB connection closed');
        callback();
    });

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
        getMenu(url, setting, [], function(links){
            console.log(settingstring + ' total # of articles: ' + links.length);
            getArticle(links, [],  function(contents){
                console.log(settingstring + ' : fetching contents done');
                fs.writeFileSync(filename, JSON.stringify(contents, null , 4));
                writeDB(contents, function(){
                    console.log(settingstring + ': write to DB done');
                    callback(settingstring);
                });
            });
        });
    }
}
