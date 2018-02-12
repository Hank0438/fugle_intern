var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

//var fs = require('fs');
// fs.readFileSync('.')

var url = 'https://www.ptt.cc/bbs/Stock/M.1468205953.A.176.html';
request(url, function(err,res,body) { 
    /* Callback 函式 */
    /* e: 錯誤代碼 */
    /* b: 傳回的資料內容 */
    if (!err && res.statusCode === 200){
        var $ = cheerio.load(body);
        var results = [];
        var article = {
        
            title: $('title').text(),
        
            author: $('.article-meta-value').first().text(),
      
            likeCount: $('.push-tag').not('.f1').length,      

            content: $('#main-content').find('.article-metaline').remove().end()
                                   .find('.article-metaline-right').remove().end()
                                   .find('span[class="f2"]').remove().end()
                                   .find('.push').remove().end()
                                   .text(),

      // $('#main-content').find('span[class="f2"]').remove(),
      // $('#main-content').find('.push').remove(),
      // $('#main-content').find('.article-metaline').remove(),
      // $('#main-content').find('.article-metaline-right').remove(),
      // content: $('#main-content').text(),
        };
        results.push(article);
    };
    console.log('we found: ', article);
    fs.writeFileSync("results.json",JSON.stringify(results));
    console.log('file saved');

});


// Promise.delay(1000).then(function(){
//     // ....
// })