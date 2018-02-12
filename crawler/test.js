var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var string = '1. 標的：3662 2. 分類：多 3. 分析/正文： 只限還沒買 後天有空可以跑開戶券商的買一張 我自己是4+1 其中一個戶頭買了兩張 收購價128 過了就是現賺快3萬 沒過可能賠到1萬5以上，以3662線型來看 跌破80機會不大 就算破了一年內站上80也是一塊蛋糕 今天量才不到5000 要過3萬8千戶的機會也很低 4. 進退場機制： 1.收購少於3萬8千張失敗-還券後直接停損或80元停損 2.超過3萬8千戶抽籤又沒抽到，25%在日本人手上，放著慢慢等漲上110 3.其他那些日本人不付錢之類的當笑話看就好，過了日本人要進樂陞董事會的';

console.log(string.indexOf('機會會'));

/*
fs.readFileAsync("company_symbols.json", "utf8").then(function(contents) {

    var result = [];
    return Promise.each(JSON.parse(contents), function(current, index){
        //console.log(current.mapTo[0].symbol_id + ' - ' + current.terms);
        result.push({
            symbol : current.mapTo[0].symbol_id,
            keywords : current.terms
        });
        return;
    }).then(function(){
        return result;
    });

}).then(function(result){
    return Promise.each(result, function(current, index){
        console.log(current.symbol + '  ' + current.keywords.length + ' ' + current.keywords );
    });

}).catch(function(e) {
    console.log(e);
});
*/
