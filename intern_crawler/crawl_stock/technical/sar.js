var Promise = require('bluebird');
var moment = require("moment");
var _ = require("lodash");

if(require.main === module){
    var request = require('request-promise');
    var type = "FCNT000002";//近3-4年股價
    var stock = process.argv[2] || "2330";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var day = container.rawContent.day;
        sar(day);
    });
}

//definition:
//SARt = SARt-1 + AF * ( EP - SARt-1)        
//其中AF為加速因子(acceleration factor)，EP為極值(extreme price)
//反轉條件：SARt與當天價格發生交會，即下跌波段時SARt < Hight，上漲波段時SARt > Lowt，
//即為反轉訊號。此時，SAR0= EP。
//source:
//https://www.moneydj.com/KMDJ/Wiki/wikiViewer.aspx?keyid=ea368946-3325-46b0-8c67-eead6baafec7

function sar(data){
    var sar = 0;
    var ep = 0;
    var af = 0.02;
    var stat = null;//用來判斷漲勢(0)還是跌勢(1)
    data.forEach(function(row, index){
        var days = data.slice(0, index-1);
        var low_days =  (_.min(days, "low")).low;
        var high_days = (_.max(days, "high")).high;
        if(stat === 0){//上漲波段, sar要一直在close之下
            if(sar > row.close){//上轉下
                stat = 1;
            }
            ep = high_days;
            sar = low_days;
            if(row.high > data[index-1].high && af < 0.2){
                af += 0.02;
            }
            sar= sar + af * (ep - sar);
        }
        if(stat === 1){//下跌波段, sar要一直在close之上
            if(sar < row.close){//下轉上
                stat = 0;
            }
            ep = low_days;
            sar = high_days;
            if(row.low < data[index-1].low && af < 0.2){
                af += 0.02;
            }
            sar= sar + af * (ep - sar);
        }
    });
};