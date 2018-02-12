var Promise = require('bluebird');
var request = require('request-promise');
var stock = "8080";
var type = "FCNT000039";//近五年收盤價
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

request(url).then(function(data){
    var container = JSON.parse(data.toString());
    price_continuous_increase(container, undefined, undefined);
});

var price_continuous_increase = function(container, previousTag, option){
    var judge = undefined;
    var length = (container.rawContent).length;
    for (var i = length - 1; i > 0; i--) {
        var current = container.rawContent[i].close;
        var previous = container.rawContent[i-1].close;
        rate = (current/previous) - 1;
        console.log("NO."+i+", rate : "+rate);
        if(rate < 0.03){
            if(judge !== true){//先前沒有連三日漲幅，未達3%
                judge = false;
            }
            console.log("NO."+(length-i)+", judge : "+judge);
            return judge;
        } 
        if(rate >= 0.03 && i <= length - 3){//漲幅大於3%且連續三日以上
            judge = true;
            if(i === 1){
                console.log("NO."+(length-i)+", judge : "+judge);
                return judge;
            }
        }
    }
};