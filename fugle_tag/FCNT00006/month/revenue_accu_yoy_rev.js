var Promise = require('bluebird');
var request = require('request-promise');
var stock = "2330";
var type = "FCNT000006";//近五年營收
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

if(require.main === module){
    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        container.rawContent.forEach(function(content){
            var res = revenue_accu_yoy_rev(content, undefined, undefined);
            console.log(res);
        });
    });
}

var revenue_accu_yoy_rev = function(content, previousTag, option){
    var accu_yoy = content.data.accu.yoy;
    var judge = false;
    if(accu_yoy <= -0.20){
        judge = true;
    }
    return {
        date : new Date( content.year ,  content.month -1 ),
        type : "revenue_accu_yoy_rev",
        tag_value : {'N' : accu_yoy},
        data_value : {}
    };
};

module.exports={judge : revenue_accu_yoy_rev};
