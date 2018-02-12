var Promise = require('bluebird');
var request = require('request-promise');
var stock = "2330";
var type = "FCNT000006";//近五年營收
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

if(require.main === module){
    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        container.rawContent.forEach(function(content){
            var res = revenue_current_mom_rev(content, undefined, undefined);
            console.log(res);
        });
    });
}

var revenue_current_mom_rev = function(content, previousTag, option){
    var current_mom = content.data.current.mom;
    var judge = undefined;
    if(current_mom !== undefined){
        judge = false;
        if(current_mom <= -0.20){
            judge = true;
        }
    }
    return {
        date : content.year+"_" + content.month,
        type : "revenue_current_mom_rev",
        tag_value : {'N' : current_mom},
        data_value : {}
    };
};

module.exports={judge : revenue_current_mom_rev};
