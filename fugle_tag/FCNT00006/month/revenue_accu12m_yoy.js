var Promise = require('bluebird');
var request = require('request-promise');
var stock = "2330";
var type = "FCNT000006";//近五年營收
var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

request(url).then(function(data){
    var container = JSON.parse(data.toString());
    revenue_accu12m_yoy(container, undefined, undefined);
});

var revenue_accu12m_yoy = function(container, previousTag, option){
    var accu12m_now = 0;
    var accu12m_last = 0;
    var judge = undefined;
    if((container.rawContent).length < 24){
        return {
            date : new Date( container.year ,  container.month -1 ),
            type : "revenue_accu12m_yoy",
            tag_value : {'N' : undefined},
            data_value : {}
        }
    }
    else{
        for (var i = 0; i < 12; i++) {
            accu12m_now += container.rawContent[i].data.current.revenue;
            accu12m_last += container.rawContent[i].data.current.lastyear;
        }
        rate = (accu12m_now/accu12m_last) - 1;
        judge = false;
        if(accu12m_now > accu12m_last){
            if(Math.round(rate*100) >= 20){
                judge = true;
            }
        }
        console.log("accu12m_now : " + accu12m_now);
        console.log("accu12m_last : " + accu12m_last);
        console.log(rate + "/" + judge);
        return {
            date : new Date( container.year ,  container.month -1 ),
            type : "revenue_accu12m_yoy",
            tag_value : {'N' : rate},
            data_value : {}
        }
    }
}

module.exports={judge : revenue_accu12m_yoy};
