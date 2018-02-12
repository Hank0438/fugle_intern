var Promise = require('bluebird');
var numeral = require("numeral");



if(require.main === module){
    var request = require('request-promise');
    var stock = "2330";
    var type = "FCNT000006";//近五年營收
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        container.rawContent.forEach(function(content){
            var res = revenue_current_mom(content, undefined, undefined);
            console.log(res);
        });
    });
}

var revenue_current_mom = function(content, previousTag, option){
    var current_mom = content.data.current.mom;
    var judge = undefined;
    if(current_mom !== undefined){
        judge = false;
        if(current_mom >= 0.20){
            judge = true;
        }
    }
    return {
        date : new Date( content.year ,  content.month -1 ),
        type : "revenue_current_mom",
        tag_value : {'N' : current_mom},
        data_value : {}
    };
};

module.exports={judge : revenue_current_mom};
