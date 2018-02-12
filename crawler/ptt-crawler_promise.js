// npm install request cheerio json2csv moment
var request = require('request'),
    request_promise = require('request-promise'),
    cheerio = require('cheerio'),
    json2csv = require('json2csv'),
    moment = require('moment'),
    mongoose = require('mongoose'),
    Promise = require('bluebird'),
    database = require('./model/PTT'),
    _ = require('lodash'),
    ipRegex = require('ip-regex'),
    fs = Promise.promisifyAll(require('fs'));

var HOST = 'https://www.ptt.cc';
var pttCrawler = database.pttCrawler;
var mgrCrawler = database.crawler;
var logTable = database.logTable;
var global_err_log = '<br/>';
var symbol_table = [];
// PART1:只是宣告，將每個index的連結寫入links，直到到預設的index被讀取

var getMenu = function (url, setting, links, titles, authors) {
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
                    authors.push($(e).find('.author').text());
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
            return getMenu(HOST + lastPage, setting, links, titles, authors);
        }else {
            var arr = [];
            for (var i = 0; i < links.length; i++) {
                var obj = {
                    title : titles[i],
                    link : links[i],
                    author : authors[i]
                }
                arr.push(obj);
            }
            return [arr,links,titles,authors];
        }
    }).catch(function(err){
        console.log('Connect to PTT error ' + url);
        global_err_log = global_err_log + 'Connect to PTT error ' + url + '<br/>';
        return [];
    });
};
//PART2:只是宣告，將內文從每篇連結的article寫入contents
var getOneArticle = function(obj){
    var url =  HOST+obj.link;
    var cookie = request.cookie('over18=1');
    var j = request.jar();
    j.setCookie(cookie, url);

    return request_promise({url:url, jar: j}).then(function (body) {
        console.log('fetching '+ url + ' ...');
        // Transform source to DOM object
        var $ = cheerio.load(body);
        // 抓推+噓文的部分
        var c = [];
        var good = 0;
        var normal = 0;
        var bad = 0;
        var $push_list = $(".push");


        $push_list.each(function(index, value){
            var $push = $(value);
            var result = {
                express : $push.find('.push-tag').text(),
                name : $push.find('.push-userid').text(),
                words : $push.find('.push-content').text(),
                time : $push.find('.push-ipdatetime').text().slice(-12),
                commentIp : $push.find('.push-ipdatetime').text().slice(0,-13).trim()
            }
            switch(result.express.trim()){
                case '推' :
                    good++;
                    break;
                case '噓' :
                    normal++;
                    break;
                case '→' :
                    bad++;
                    break;
            }
            if(ipRegex().test(result.commentIp)===false){
              result.commentIp = "none";
            }
            c.push(result);
        });


        //var article_id = url;
        //console.log(url.slice((HOST+'/bbs/'+board_name).length).slice(1, 19)/*.replace(/\./g, '')*/);

        // get ip
        var ip_addr = 'No ip information';
        if ($('span.f2').text().match(ipRegex.v4())){
            ip_addr = $('span.f2').text().match(ipRegex.v4())[0];
            }
        else {
            console.log(ip_addr);
        }
        // get publishdate
        var publishdate = $('span.article-meta-value').eq(-1).text();
        if(moment(publishdate,'YYYY-MM-DD').isValid()){
            publishdate = moment(publishdate, 'ddd MMM D HH:mm:ss YYYY').format('YYYY-MM-DD HH:mm:ss');
        }
        else{
            publishdate = "0";
        }
        //console.log(publishdate);

        // get author and nickname
        var author_nickname = $('div.article-metaline:nth-child(1) > span:nth-child(2)').text()
        var author = '', nickname = '';
        // if(author_nickname.match(/(.+)\s\(/))   author = author_nickname.match(/(.+)\s\(/)[1];
        if(author_nickname.match(/\((.+)\)/))   nickname = author_nickname.match(/\((.+)\)/)[1];
        console.log(author + '      ' + nickname);

        // fetch article information
        var article = {
            article_id : url.slice((HOST+'/bbs/'+board_name).length).slice(1, 19).replace(/\./g, ''),
            author : obj.author,
            nickname : nickname,
            title : obj.title,
            publishedDate : publishdate,
            board: board_name,
            link : url,
            ip : ip_addr,
            likeCount : good,
            sosoCount : normal,
            dislikeCount : bad,
            content : $('#main-content').find('.article-metaline').remove().end()
                                .find('.article-metaline-right').remove().end()
                                .find('span[class="f2"]').remove().end()
                                .find('.push').remove().end()
                                .text(),
            comment : c,
            symbol_id : []
        };

        var search_string = article.title + ' ' + article.content;
        return Promise.each(symbol_table, function(current, index){
            return Promise.each(current.keywords, function(keywords, index2){
                if((article.title).indexOf(keywords) != -1 && article.symbol_id.indexOf(current.symbol) == -1){
                    article.symbol_id.push(current.symbol)
                }
                if((article.content).indexOf(keywords) != -1 && article.symbol_id.indexOf(current.symbol) == -1 && keywords != current.symbol){
                    article.symbol_id.push(current.symbol)
                }
            });
        }).then(function(){
            return article;
        });
        //console.log(article.ip, good, normal, bad);
    }).catch(function(err){
        console.log('error getOneArticle: ' + url + err);
        global_err_log = global_err_log + 'error to get article: ' + url +'<br/>';
        return -1;
    });
}

//check everything is not null
var check = function(article){
    if (!article) return article;
    if(_.isString(article.author)=== false)        console.log(article.title+" author is null");
    if(_.isString(article.title)=== false)         console.log(article.link+" title is null");
    if(_.isString(article.publishedDate)=== false) console.log(article.title+" publishedDate is null");
    if(_.isString(article.board)=== false)         console.log(article.title+" board is null");
    if(_.isString(article.link)=== false)          console.log(article.title+" link is null");
    //if(article.comment.length=== 0)                console.log(article.title+" no comment");
    /*if(!article.comment.length || article.comment.length=== 0)                console.log(article.title+"is no comment");
    if(article.comment.length < article.likeCount || article.comment.length < article.dislikeCount || article.comment.length < article.sosoCount)
    console.log("express_count err");
    */
    return article;
}


var getArticle = function (arr) {
    return Promise.map(arr, function(obj){
        return Promise.delay(500).then(function(){
            return getOneArticle(obj).then(function(article){
                return check(article);
            });
        });
    }, {concurrency : 1})
};

var writeDB = function (contents){
    /*
    return pttCrawler.create(contents).then(function(response){
        console.log('write ptt db done');
    }).catch(function(err){
        console.log('write ptt db error' +err);
    });
    */
    return Promise.each(contents, function(content){
        return pttCrawler.findOneAndUpdate(
            {'article_id' : content.article_id},
            content,
            {upsert : true, new : true}).exec().then(function(response){
                //console.log('write ptt db done');
            }).catch(function(err){
                console.log(err);
            });
    }).then(function(){
        console.log('write ptt db done');
        return;
    });

};

var addSymbol = function(){
    pttCrawler.update()
}

// export module
module.exports = {
    start : function(board_name, limit_type, limit_number, callback){
        var setting = {
            board_name : board_name,
            limit_type : limit_type,
            limit_number : limit_number,
        };
        console.log('Current Time: ' + moment().format('YYYY_MM_DD_HH_mm_ss'));
        var settingstring = setting.board_name + '_' + setting.limit_type + '_' + setting.limit_number.toString();
        var url = HOST + '/bbs/' + board_name + '/index.html';
        var filename = './logfile/' + moment().format('YYYY_MM_DD_HH_mm_ss') + '_' + settingstring + '.json';
        var total_link_length, final_link_length;

        return fs.readFileAsync("company_symbols.json", "utf8").then(function(contents){
            return Promise.each(JSON.parse(contents), function(current, index){
                //console.log(current.mapTo[0].symbol_id + ' - ' + current.terms);
                symbol_table.push({
                    symbol : current.mapTo[0].symbol_id,
                    keywords : current.terms
                });
                return;
            });
        }).then(function(){
            return getMenu(url, setting, [], [], []).then( function(array){
                var arr = array[0];
                var links = array[1];
                var titles = array[2];
                var authors = array[3];
                console.log("Parse links : "+links);
                console.log("titles : "+titles);
                console.log("authors : "+authors);
                console.log(settingstring + ' total # of articles: ' + links.length);
                total_link_length = links.length;

                return getArticle(arr).then(function(contents){
                    console.log(settingstring + ' : fetching contents done');
                    _.pull(contents, -1);
                    final_link_length = contents.length;

                    return writeDB(contents);
                }).then(function(contents){
                    //final_link_length = contents.length;
                    //console.log(total_link_length + '___' + final_link_length);
                    return [final_link_length, total_link_length];
                });
            });
        });
    }
}


if (require.main === module) {
    var board_name = 'NBA',
        limit_type = 'page',
        limit_number = 1,
        fromwhere = '';

    if (process.argv.length == 5 || process.argv.length == 6){
        board_name = process.argv[2];
        limit_type = process.argv[3];
        limit_number = process.argv[4].toString();
        if(process.argv.length == 6){
            fromwhere = process.argv[5];
        }
    }
    else if (process.argv.length != 2){
        console.log('unvalid command');
        mongoose.disconnect();
        return;
    }

    console.log('New command received: '+board_name+' '+limit_type+' '+limit_number);

    mgrCrawler.findOne({
        'board_name' : board_name,
        'setting.limit_type' : limit_type,
        'setting.limit_number' : limit_number
    }).exec().then(function(res){
        if (!res) return 2;
        if (res.current == 'Crawling' && fromwhere != 'force'){
            return 1;
        }

        res.current = 'Crawling';

        return res.save(function(err){
            if(err) console.log(err);
        }).then(function(){
            var log = {
                board_name : board_name,
                setting : {limit_type : limit_type, limit_number : limit_number},
                last_update : 'Crawling',
                last_updatetime : moment().format('YYYY-MM-DD HH:mm:ss'),
                info :'Sleep -> Crawling' + global_err_log
            };
            return logTable.create(log).then(function(response){
                console.log('Sleep -> Crawling logged');
            }).catch(function(err){
                console.log('write logTable error');
            });
        });

    }).then(function(state){
        if (state == 1){
            console.log(board_name +' '+ limit_type +' '+ limit_number + ' Is Crawling Now ... Bye');
            mongoose.disconnect();
            return;
        }
        else if(state == 2){
            console.log(board_name +' '+ limit_type +' '+ limit_number + ' Not Found ... Bye');
            mongoose.disconnect();
            return;
        }

        module.exports.start(board_name, limit_type, limit_number).then(function(data){
            var num = new Number(100*(data[0]/data[1]));
            var last_update = num.toFixed(1) +'% ('+data[0]+'/'+data[1]+')';
            return mgrCrawler.findOne({
                'board_name' : board_name,
                'setting.limit_type' : limit_type,
                'setting.limit_number' : limit_number
            }).exec().then(function(res){
                res.current = 'Sleep';
                res.last_updatetime =  moment().format('YYYY-MM-DD HH:mm:ss');
                res.last_update = last_update;
                return res.save(function(err){
                    if(err) throw err;
                    console.log('Sleep already save');
                }).then(function(){
                    var log = {
                        board_name : board_name,
                        setting : {limit_type : limit_type, limit_number : limit_number},
                        last_update : 'Sleep',
                        last_updatetime : moment().format('YYYY-MM-DD HH:mm:ss'),
                        info : 'Crawling -> Sleep ' + last_update + global_err_log
                    };
                    return logTable.create(log).then(function(response){
                        console.log('Crawling -> Sleep logged');
                        mongoose.disconnect();
                    }).catch(function(err){
                        console.log('write logTable error');
                    });
                });
            });
        });
        return;
    });
}
