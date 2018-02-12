// npm install request cheerio json2csv
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var son2csv = require('json2csv');
var moment = require('moment');
var mongoose = require('mongoose');
var _ = require('lodash');


//limit by "page" or "day"
var board_name = process.argv[2];
var limit_type = process.argv[3];
var limit_number = process.argv[4];

if ((limit_type != 'day' && limit_type != 'page') || isNaN(parseInt(limit_number)) ){
  console.log('unknown comment: '+ limit_type + " " + limit_number);
  return;
}
/*
console.log(moment().subtract(3, 'days').format('YYYY-MM-DD'));
return;
*/

var HOST = 'https://www.ptt.cc';

// console.log("i've been read");
//PART1:只是宣告，將每個index的連結寫入links，直到到預設的index被讀取
var getMenu = function (url, callback, links) {
  var links = links || []; // Set default value for links (initial call)

  // for over-18 test
  var cookie = request.cookie('over18=1');
  var j = request.jar();
  j.setCookie(cookie, url);

  request({url: url, jar: j}, function (err, res, body) {
    //console.log(body);
    //如果都正確就執行
    if (!err && res.statusCode == 200) {
      var lastPage;
      var stop = 0;
      var $ = cheerio.load(body); // Transform source to DOM object.
      //對於每一個標籤做處理

      // if index.html, ignore bottom articles
      var div_list = (url == 'https://www.ptt.cc/bbs/'+ board_name +'/index.html')?$('div.r-list-sep').prevAll(): $('div.r-ent');
      div_list.each(function(i, e){
        if($(e).find('a').attr('href') != undefined){
          var day = moment().format('YYYY') + '-' + $(e).find('div.meta > div.date').text().replace('/', '-').replace(' ', '0');
          if (limit_type == 'day' && day == moment().subtract(limit_number, 'days').format('YYYY-MM-DD'))
            stop = 1 ;
          else{
            //遇到標題前面有M會有把M的HTML標籤也抓下來的問題
            console.log("title : "+$(e).find('a').text());
            links.push($(e).find('a').attr('href'));
          }
        }
      });

      lastPage = $('a.wide:nth-child(2)').attr('href'); // Try to get the next page
      console.log("lastpage = " + lastPage);

      if (limit_type == 'page'){
        limit_number--;
        if (limit_number == 0) stop = 1;
      }

      if (stop == 0/*lastPage !== '/bbs/'+ board_name +'/index3108.html'*/) {
        getMenu(HOST + lastPage, callback, links); // Pass this state as the beginning state in the next round.
      } else {
          // the recursion is over.
          callback(links);
      }
    }
    else console.log('request error: ' + url + ' ' + err);
  });
};


//PART2:只是宣告，將內文從每篇連結的article寫入contents
var getArticle = function (links, callback, contents) {
  contents = contents || [];
  if (links.length === 0) {
    callback(contents);
  }
  console.log(links[0]);
  // for over 18 test
  var url = HOST + links[0];
  var cookie = request.cookie('over18=1');
  var j = request.jar();
  j.setCookie(cookie, url);
  request({url: url, jar: j} , function (err, res, body) {
    if (!err && res.statusCode === 200) {
      //console.log(body); // To resolve the mysterious behaviour on Windows, which the program quits immediately, still working on it.
      var $ = cheerio.load(body);

      var c=[];
      for(i=0; i<$(".push-tag").length; i++){
        result = {
          express : $(".push-tag").eq(i).text(),
          name : $(".push-userid").eq(i).text(),
          words : $(".push-content").eq(i).text(),
          time : $(".push-ipdatetime").eq(i).text()
        };
      c.push(result);
      };
      //-------------------update at 2016/08/18/17:00--------------------
      var title = $('span.article-meta-value').eq(-2).text();
      // if(title===""){
  
      // }
      var publishedDate = $('span.article-meta-value').eq(-1).text();
      // if(publishedDate===""){
      //  remain undefined...
      // }
      var board = $('a.board').find('span.board-label').remove().end().text().slice(0,-4);
      //----------------------------------------------------------------

      var article = {
          author: $('div.article-metaline:nth-child(1) > span:nth-child(2)').text(),
          title: title,
          publishedDate: publishedDate,
          board: board,
          likeCount : $('.push-tag').not('.f1').length,
          //content: $('#main-content').children().remove().end().text() // some error happened
          content : $('#main-content').find('.article-metaline').remove().end()
                                    .find('.article-metaline-right').remove().end()
                                    .find('span[class="f2"]').remove().end()
                                    .find('.push').remove().end()
                                    .text()
          // comment : [{exress : "", name: "", words: "", time : ""},
          //            {exress : "", name: "", words: "", time : ""},
          //            {exress : "", name: "", words: "", time : ""}]
        // end: revert back to main-content
      };
      console.log("=============================================");
      console.log("title : "+article.title);
      console.log("publishedDate : "+article.publishedDate);
      console.log("board : "+article.board);
      console.log("=============================================");
      article.comment = c;
      contents.push(article);
      links = links.slice(1);
      //提取字符串的某個部分，並以新的字符串返回被提取的部分
      console.log("link length: "+links.length);
      //每0.5秒抓一篇
      setTimeout(function() {
        getArticle(links, callback, contents)
      }, 500);

    } else {
      // console.log(res.statusCode);
      if (links[0] != undefined)  console.log("stage2 error: "+err);
      callback(contents);
    }
  });
};


console.log('start to parse ' + board_name + '...');

//PART3:將爬下來的資料匯入DB
//虛線裡面是關於DB做的修改
//一共有三個部分
//弟一部分
//---------------------------------------------------------------------------
mongoose.connect( 'mongodb://git.fugle.tw:27017/fortest');

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
//----------------------------------------------------------------------


//第二部分
//db.once()一定要包住getMenu()才寫得進DB
//------------------------------------------------------------------------------------
db.once('open', function(callback){
  console.log("Connected to DB");


  getMenu('https://www.ptt.cc/bbs/'+ board_name +'/index.html', function (links) {
  getArticle(links, function(contents) {
    //爬到幾篇
    console.log(contents.length);
    // fs.writeFileSync("contents.json",JSON.stringify(contents));
    //改成以下:
      for(var n=0; n<=contents.length-1; n++){
        var com = [];
        console.log(n+"篇");
        for(var i=0; i<=contents[n].comment.length-1; i++){
          com.push(contents[n].comment[i]);
          console.log("推文數/篇:"+i+"/"+n);
        };
        var read = new pttCrawler({
          author:        contents[n].author,
          title:         contents[n].title,
          publishedDate: contents[n].publishedDate,
          board:         contents[n].board,
          likeCount:     contents[n].likeCount,
          content:       contents[n].content,
          comment:       com
        });
        read.save(function(err){
          if ( err ) throw err;
        });
      };
      console.log("Book Saved Successfully");
    });
    console.log("Read Successfully");
  });
});
//---------------------------------------------------------------------------------------