var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var numeral = require("numeral");
var moment = require("moment");
var _ = require("lodash");
var fs = require('fs');

var start = function(){
    fs.readFileAsync('C:/Users/USER/Desktop/Fugle-Tags/test/tags.json').then(function(data){
        var info = JSON.parse(data.toString());
        info.forEach(function(day){
            var text_arr = [];
            day.tags.forEach(function(tag){
                var type = tag.type;
                // console.log(tag.date.$date+" : "+type);
                // if(type === "stock_price_Ndays_rise") stock_price_Ndays_rise(tag);
                
                var obj_fun = {
                    fi_overbought : fi_overbought,
                    dl_overbought : dl_overbought,
                    it_overbought : it_overbought, 
                    fi_oversold : fi_oversold,
                    dl_oversold : dl_oversold,
                    it_oversold : it_oversold,
                    kd_gold : kd_gold,
                    kd_death : kd_death,
                    macd_gold : macd_gold,
                    macd_death : macd_death,
                    rsi_gold : rsi_gold,
                    rsi_death : rsi_death,
                    stock_price_past_year_high : stock_price_past_year_high,
                    stock_price_past_year_low : stock_price_past_year_low,
                    stock_price_Ndays_rise : stock_price_Ndays_rise,
                    stock_price_Ndays_fell : stock_price_Ndays_fell,
                    stock_price_current_year_high : stock_price_current_year_high,
                    stock_price_current_year_low : stock_price_current_year_low
                }
                for (var prop in obj_fun) {
                    if(type === prop){
                        var s = obj_fun[prop](tag);
                        if(s !== undefined) text_arr.push(s);
                    } 
                }
            });
            console.log(text_arr);
        });
    });
}

var stock_price_current_year_high = function(tag){
    var text = "股價創今年新高";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
};

var stock_price_current_year_low = function(tag){
    var text = "股價創今年新低";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
};

var stock_price_past_year_high = function(tag){
    var text = "股價創近52週新高";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
};

var stock_price_past_year_low = function(tag){
    var text = "股價創近52週新低";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
};

var stock_price_Ndays_rise = function(tag){
    var text = "連" + tag.tag_value.N + "日大漲且漲幅大於3%";
    var date = moment(tag.date.$date).toDate();
    var value = tag.data_value;
    for (var i = 0; i < value.length; i++) {
        if(value[i] <= 3) return;    
    }
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
};

var stock_price_Ndays_fell = function(tag){
    var text = "連" + tag.tag_value.N + "日大跌且跌幅大於3%";
    var date = moment(tag.date.$date).toDate();
    var value = tag.data_value;
    for (var i = 0; i < value.length; i++) {
        if(value[i] >= -3) return;    
    }
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
};

var fi_overbought = function(tag){
    var text = "外資連" + tag.tag_value.N + "日買超";
    var date = moment(tag.date.$date).toDate();
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
}

var fi_oversold = function(tag){
    var text = "外資連" + tag.tag_value.N + "日賣超";
    var date = moment(tag.date.$date).toDate();
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
}

var dl_overbought = function(tag){
    var text = "自營連" + tag.tag_value.N + "日買超";
    var date = moment(tag.date.$date).toDate();
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
}

var dl_oversold = function(tag){
    var text = "自營連" + tag.tag_value.N + "日賣超";
    var date = moment(tag.date.$date).toDate();
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
}

var it_overbought = function(tag){
    var text = "投信連" + tag.tag_value.N + "日買超";
    var date = moment(tag.date.$date).toDate();
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
}

var it_oversold = function(tag){
    var text = "投信連" + tag.tag_value.N + "日賣超";
    var date = moment(tag.date.$date).toDate();
    var condition = (tag.tag_value.N >= 3);
    if(condition) return text;
}

var kd_gold = function(tag){
    var text = "日KD黃金交叉";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
}

var kd_death = function(tag){
    var text = "日KD死亡交叉";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
}

var macd_gold = function(tag){
    var text = "日MACD黃金交叉";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
}

var macd_death = function(tag){
    var text = "日MACD死亡交叉";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
}

var rsi_gold = function(tag){
    var text = "日RSI黃金交叉";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
}

var rsi_death = function(tag){
    var text = "日RSI死亡交叉";
    var date = moment(tag.date.$date).toDate();
    var condition = tag.tag_value.tag;
    if(condition) return text;
}

// fi_overbought
// dl_overbought
// it_overbought
// fi_oversold
// dl_oversold
// it_oversold
// kd_gold
// kd_death
// macd_gold
// macd_death
// rsi_gold
// rsi_death
// stock_price_past_year_high
// stock_price_past_year_low
// stock_price_Ndays_rise
// stock_price_Ndays_fell
// stock_price_current_year_high
// stock_price_current_year_low


start();