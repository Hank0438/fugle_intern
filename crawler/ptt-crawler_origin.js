// npm install request cheerio json2csv
var fs = require('fs'),
    request = require('request'),
    cheerio = require('cheerio'),
    json2csv = require('json2csv');

var HOST = 'https://www.ptt.cc';
// console.log("i've been read");
//PART1:只是宣告，將每個index的連結寫入links，直到到預設的index被讀取
var getMenu = function (url, callback, links) {
  var links = links || []; // Set default value for links (initial call)
  request(url, function (err, res, body) {
    //如果都正確就執行
    if (!err && res.statusCode == 200) {
      var lastPage;
      var $ = cheerio.load(body); // Transform source to DOM object.
      //對於每一個標籤做處理
      $('div.r-ent a').each(function (i, e) { // Interate collections
        links.push($(e).attr('href'));//將連結爬進links的array
      });
      lastPage = $('a.wide:nth-child(2)').attr('href'); // Try to get the next page
      console.log(lastPage);
      if (lastPage !== '/bbs/Stock/index3100.html') {
        getMenu(HOST + lastPage, callback, links); // Pass this state as the beginning state in the next round.
      } else {
        callback(links);
	// the recursion is over.
      }
    }
  });
};

//PART2:只是宣告，將內文從每篇連結的article寫入contents
var getArticle = function (links, callback, contents) {
  contents = contents || [];
  if (links.length === 0) {
    callback(contents);
  }
  request(HOST + links[0], function (err, res, body) {
    if (!err && res.statusCode === 200) {
      //console.log(body); // To resolve the mysterious behaviour on Windows, which the program quits immediately, still working on it.
      var $ = cheerio.load(body);
      var article = {
        author: $('div.article-metaline:nth-child(1) > span:nth-child(2)').text(),
	      title: $('div.article-metaline:nth-child(3) > span:nth-child(2)').text(),
	      publishedDate: $('div.article-metaline:nth-child(4) > span:nth-child(2)').text(),
	      board: $('.article-metaline-right > span:nth-child(2)').text(),
        likeCount : $('.push-tag').not('.f1').length,
	      content: $('#main-content').children().remove().end().text()
	      // end: revert back to main-content
      };
      contents.push(article);
      links = links.slice(1);
      //提取字符串的某個部分，並以新的字符串返回被提取的部分
      console.log("link length: "+links.length);
      //每0.5秒抓一篇
      setTimeout(function() {
        getArticle(links, callback, contents);
      }, 500);

    } else {
      // console.log(res.statusCode);
      console.log("stage2 error: "+err);
      callback(contents);
    }
  });
};

//PART3:將爬下來的資料匯出
//JSON檔匯出
getMenu('https://www.ptt.cc/bbs/stock/index.html', function (links) {
  getArticle(links, function(contents) {
    //爬到幾篇
    console.log(contents.length);
    fs.writeFileSync("contents.json",JSON.stringify(contents));
    // if (err) {
    //   throw err;
    //   console.log("stage3 error: "+err);
    // }
    console.log('file saved');
  });
});

//CSV檔匯出
/*
getMenu('https://www.ptt.cc/bbs/stock/index.html', function (links) {
  getArticle(links, function(contents) {
    var fields = Object.keys(contents[0]);
    //爬到幾篇
    console.log(contents.length);
    json2csv({ data: contents, fields: fields }, function(err, csv) {
      if (err) {
        console.log("stage3 error: "+err);
      }
      fs.writeFile('file.csv',csv, function(err) {
       if (err) {
         throw err;
      }
       console.log('file saved');
      });
    });
  });
});
*/
