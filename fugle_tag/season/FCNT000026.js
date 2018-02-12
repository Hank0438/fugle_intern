var request = require('request-promise');
var constant = require('../constant.js');

var type = "FCNT000026";        //最近5年EPS(單季)
var stock = 2330;
var url = constant.FUGLE_API_ADDRESS + type + "-" + stock;

// EPS較上季成長N% (N≧20)
var eps_season_growth = function(data, previousTag, options){
    if (!data || data.rawContent.length < 2) return undefined;
    var season_growth = ((data.rawContent[0].value - data.rawContent[1].value)/data.rawContent[1].value)*100;
    console.log(season_growth)
    return (season_growth > 20)
}

// EPS較去年同期成長N% (N≧20)
var eps_year_growth = function(data, previousTag, options){
    if (!data) return undefined;
    var year_growth = data.rawContent[0].yoy*100;
    console.log(year_growth)
    return (year_growth > 20);
}

// 今年累積EPS較去年同期成長N% (N≧20)
var eps_acc_year_growth = function(data, previousTag, options){
    if (!data) return undefined;
    var acc_year_growth = data.rawContent[0].accuYoy*100;
    console.log(acc_year_growth)
    return (acc_year_growth > 20);
}

// 近4季累積EPS較前期成長N%(N≧20)
var eps_acc_near4season_growth = function(data, previousTag, options){
    if (!data || data.rawContent.length < 8) return undefined;
    var acc_4season_growth = 0, eps_acc_near4season = 0, eps_acc_before4season = 0;
    data.rawContent.map(function(raw, index){
        if(index >= 0 && index <= 3){
            eps_acc_near4season = eps_acc_near4season + raw.value;
        }
        else if(index >= 4 && index <= 7){
            eps_acc_before4season = eps_acc_before4season + raw.value;
        }
        return raw;
    })
    acc_4season_growth = (eps_acc_near4season - eps_acc_before4season)/eps_acc_before4season *100;
    console.log(acc_4season_growth);
    return (acc_4season_growth > 20);
}

// EPS較上季衰退N% (N≧20)
var eps_season_decline = function(data, previousTag, options){
    if (!data || data.rawContent.length < 2) return undefined;
    var season_growth = ((data.rawContent[0].value - data.rawContent[1].value)/data.rawContent[1].value)*100;
    console.log(season_growth)
    return (season_growth < -20)
}

// EPS較去年同期衰退N% (N≧20)
var eps_year_decline = function(data, previousTag, options){
    if (!data) return undefined;
    var year_growth = data.rawContent[0].yoy*100;
    console.log(year_growth)
    return (year_growth < -20);
}

// 今年累積EPS較去年同期衰退N% (N≧20)
var eps_acc_year_decline = function(data, previousTag, options){
    if (!data) return undefined;
    var acc_year_growth = data.rawContent[0].accuYoy*100;
    console.log(acc_year_growth)
    return (acc_year_growth < -20);
}

// 近4季累積EPS較前期衰退N%(N≧20)
var eps_acc_near4season_decline = function(data, previousTag, options){
    if (!data || data.rawContent.length < 8) return undefined;
    var acc_4season_growth = 0, eps_acc_near4season = 0, eps_acc_before4season = 0;
    data.rawContent.map(function(raw, index){
        if(index >= 0 && index <= 3){
            eps_acc_near4season = eps_acc_near4season + raw.value;
        }
        else if(index >= 4 && index <= 7){
            eps_acc_before4season = eps_acc_before4season + raw.value;
        }
        return raw;
    })
    acc_4season_growth = (eps_acc_near4season - eps_acc_before4season)/eps_acc_before4season *100;
    console.log(acc_4season_growth);
    return (acc_4season_growth < -20);
}

//TEST
request(url).then(function(data){
    data = JSON.parse(data.toString());
    // console.log(eps_season_growth(data, undefined, undefined));
    // console.log(eps_year_growth(data, undefined, undefined));
    // console.log(eps_acc_year_growth(data, undefined, undefined));
    // console.log(eps_acc_near4season_growth(data, undefined, undefined));
    // console.log(eps_season_decline(data, undefined, undefined));
    // console.log(eps_year_decline(data, undefined, undefined));
    // console.log(eps_acc_year_decline(data, undefined, undefined));
    // console.log(eps_acc_near4season_decline(data, undefined, undefined));

}).catch(function(err){
    console.log('[ERROR] request ' + url + ' error!');
})
