var Promise = require('bluebird');
var numeral = require("numeral");
var moment = require("moment");


function DataError(message) {
    this.message = message;
    this.name = "DataError";
    Error.captureStackTrace(this, DataError);
}
DataError.prototype = Object.create(Error.prototype);
DataError.prototype.constructor = DataError;


var default_data_value = {
    max : { value : Number.MIN_VALUE, date : new Date(0)}
};
var default_tag = {
    date : new Date(0),
    type : "stock_price_past_year_high",
    tag_value : { tag : false },
    data_value : default_data_value
};

function getMaxdata(data, start_date){
    start_date = new Date(start_date);
    var end_date = moment(start_date).add(1,"y").toDate();
    var max = { value : Number.MIN_VALUE, date : new Date(0)};
    var min = { value : Number.MAX_VALUE, date : new Date(0)};

    data.forEach(function(row){
        var tmpDate = new Date(row.date);
        if(tmpDate >= start_date && tmpDate <= end_date){
            if(row.close > max.value){
                max.value = row.close;
                max.date = tmpDate;
            }

            if(row.close < min.value ){
                min.value = row.close;
                min.date = tmpDate;
            }
        }
    });

    return {
        max : max,
        min : min
    };
}

if(require.main === module){
    var stock = "2330";
    var type = "FCNT000002";
    var url = "https://api.fugle.tw/v1/data/content/" + type + "-" + stock;
    var request = require('request-promise');

    request(url).then(function(data){
        var container = JSON.parse(data.toString());
        var start_date = moment(container.rawContent.day[0].date).add(1,"y").toDate();
        var res = default_tag;
        Promise.each(container.rawContent.day.filter(function(d){ return new Date(d.date) > start_date;}) , function(content){
            return Promise.resolve(stock_price_past_year(content, res, undefined)).then(function(tagres){
                res = tagres;
                console.log(res);
            }).catch(DataError,function(e){
                //console.log(e);
                var pastMaxMin = getMaxdata(container.rawContent.day, e.message);
                res.data_value = pastMaxMin;
                return Promise.resolve(stock_price_past_year(content, res, undefined));
            });
        });
    });
}

var stock_price_past_year = function( content, previousTag, option ){
    var current_date = new Date(content.date);
    var pre_data_value = Object.assign({}, previousTag.data_value);
    var past_year_date = moment(content.date).add(-1,"y").toDate();
    if(pre_data_value.max.date < past_year_date ){
        throw new DataError(past_year_date);
    }

    var tag_value = {
        tag : false
    };
    var current_data_value = {
        max : { value : pre_data_value.max.value , date : pre_data_value.max.date }
    };

    if(Number(content.close) >= Number(pre_data_value.max.value)){
        tag_value.tag = true;
        current_data_value.max.value = content.close;
        current_data_value.max.date = current_date;
    }




    return {
        date : current_date,
        type : "stock_price_past_year_high",
        tag_value : tag_value,
        data_value : current_data_value
    };
};


module.exports = {
    judge : stock_price_past_year,
    default_tag,
    default_data_value,
    require_fields : ["close"]
};
