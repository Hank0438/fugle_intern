var Promise = require('bluebird');
var request = require('request-promise');
var cheerio = require('cheerio');

//var fs = require('fs');
// fs.readFileSync('.')

var url = 'https://www.ptt.cc/bbs/Stock/M.1468205953.A.176.html';
return request(url).then(function(content){
    var $ = cheerio.load(content);
    var results = {};
    //title
    results.title = $('title').text();
    console.log('title : ', $('title').text());

    //author
    results.author = $('.article-meta-value').first().text();
    console.log('author : ', $('.article-meta-value').first().text());

    //likeCount
    results.likeCount = $('.push-tag').not('.f1').length;
    console.log('likeCount : ', $('.push-tag').not('.f1').length);

    //content
    // $('#main-content').find('span[class="f2"]').remove();
    // $('#main-content').find('.push').remove();
    // $('#main-content').find('.article-metaline').remove();
    // $('#main-content').find('.article-metaline-right').remove();
    // results.content = $('#main-content').text();
    // console.log('content : ', results.content);
    //也可以寫成這樣，下面是一行寫完的方法
    results.content = $('#main-content').find('.article-metaline').remove().end()
                                   .find('.article-metaline-right').remove().end()
                                   .find('span[class="f2"]').remove().end()
                                   .find('.push').remove().end()
                                   .text();
    console.log('content : ', results.content);
    return results;
});


Promise.delay(1000).then(function(){
    // ....
})