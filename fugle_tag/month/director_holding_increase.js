var Promise = require('bluebird');
var request = require('request-promise');
var stock = "2330";
var type = "FCNT000030";//十二個月董監持股
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

request(url).then(function(data){
    var container = JSON.parse(data.toString());
    director_holding_increase(container, undefined, undefined);
});

var director_holding_increase = function(container, previousTag, option){
    var current = 0;
    var previous = 0;
    var judge = undefined;
    for (var i = 0; i < (container.rawContent).length; i++) {
        var information = container.rawContent[i].holding_info;
        for (var j = 0; j < information.length; j++) {
            current += information[j].hld_stkno;
            previous += information[j].p_hld_stkno;
        }
        rate = (current/previous) - 1;
        if(current <= previous){
            if(judge !== true){
                judge = false;
            }
            console.log("NO."+(i+1)+", "+"rate : "+rate+", judge : "+judge);
            return judge;
        } 
        if(current > previous && i >= 2){
            judge = true;
            if(i === 11){
                console.log("NO."+(i+1)+", "+"rate : "+rate+"judge : "+judge);
                return judge;
            }
        }
    }
};