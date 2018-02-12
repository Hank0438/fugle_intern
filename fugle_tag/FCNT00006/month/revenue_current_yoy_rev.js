var Promise = require('bluebird');
var request = require('request-promise');
var stock = "2330";
var type = "FCNT000006";//近五年營收
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

if(require.main === module){
    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        container.rawContent.forEach(function(content){
            var res = revenue_current_yoy_rev(content, undefined, undefined);
            console.log(res);
        });
    });
}

var revenue_current_yoy_rev = function(content, previousTag, option){
    var current_yoy = content.data.current.yoy;
    var judge = undefined;
    if(current_yoy !== undefined){
        judge = false;
        if(current_yoy <= -0.20){
            judge = true;
        }
    }
    return {
        date : new Date( content.year ,  content.month -1 ),
        type : "revenue_current_yoy_rev",
        tag_value : {'N' : current_yoy},
        data_value : {}
    };
};

module.exports={judge : revenue_current_yoy_rev};
