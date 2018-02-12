// libraries
var moment = require('moment');
var Promise = require('bluebird');
var mongoose = require('mongoose');
mongoose.Promise = Promise;
var _ = require("lodash");

// db connection
var config = require('../config');
var connections = require('../config/connections')('fugle', ['technical', 'search']);
var Stock = connections.models['tw_stock_price'];
var StockIndicator = connections.models['stock_indicator'];
var SymbolInfo = connections.models['symbol_info'];

var kd = require("./technical/kd");
var macd = require("./technical/macd");
var rsi = require("./technical/rsi");

var errorSymbol = {
    kd : [],
    macd : [],
    rsi : [],
    ma_bias : [],
    psy : [],
    bb : [],
    william : [],
    obv : [],
    db : [],
    sar :[]
};

// get stock list
var markets = ['tw.tse', 'tw.otc' ,'tw.emg', 'tw.etf'];
               //, 'tw.otc', 'tw.emg', 'tw.etf'];

function calcSymbolIndicator(symbol_id) {
    return Promise.all([
        Stock.get60(symbol_id),
        StockIndicator.find({
            symbol_id : symbol_id
        }).sort('-date').limit(14).exec()
    ]).spread(function(data, indicators){
        var today_data = data[data.length-1];
        var today_indicator = {
            date: today_data.date,
            symbol_id : symbol_id
        };

        // no current indicator
        indicators = indicators.filter(row => row.date < today_data.date);
        var indicator = indicators[0] || {};

        // for ma: ma5, ma10, ma20, ma60
        var ma_indicator = calcMaIndexToday(data);
        today_indicator = Object.assign(today_indicator, ma_indicator);

        // for bias : bias5, bias10, bias20, bias60
        var bias_indicator = calcBiasIndexToday(today_data, ma_indicator);
        today_indicator = Object.assign(today_indicator, bias_indicator);

        // for psy : psy12, psy24
        var psy_indicator = calcPsyIndexToday(data);
        today_indicator = Object.assign(today_indicator, psy_indicator);

        // for bollinger band : bb_upper, bb_lower, bb_percent_b, bb_bandwidth
        var bb_indicator = calcBBIndexToday(data);
        today_indicator = Object.assign(today_indicator, bb_indicator);

        // for william : william14, william28, william42
        var william_indicator = calcWilliamIndexToday(data);
        today_indicator = Object.assign(today_indicator, william_indicator);

        // for obv : obv
        var obv_indicator = calcObvIndexToday(data);
        today_indicator = Object.assign(today_indicator, obv_indicator);

        // for dmi : +di, -di, dx, adx, adxr
        var dmi_indicator = calcDMIIndexToday(data);
        today_indicator = Object.assign(today_indicator, dmi_indicator);

        // for sar : sar_current, sar_af, sar, sar_ep
        var sar_indicator = calcSARIndexToday(data);
        today_indicator = Object.assign(today_indicator, sar_indicator);

        //for kd : k9, d9
        var latest_kd_indicator = {
            k: indicator.k9 || 50 ,
            d: indicator.d9 || 50
        };
        var kd_tmpdata = _.takeRight(data, kd.day_before + 1);
        if (kd_tmpdata.length === kd.day_before + 1){
            var kd_indicator = kd.calcIndex(latest_kd_indicator, kd_tmpdata);
            today_indicator['k9'] = kd_indicator['k'];
            today_indicator['d9'] = kd_indicator['d'];
        }

        //for macd : ema12, ema26 , macd12_26
        var macd_fields = ["ema12","ema26","macd12_26"];
        var latest_macd_indicator = _.pick(indicator, macd_fields);
        var macd_indicator = {};
        if(data.length > 34){
            var macd_tmpdata = _.takeRight(data, macd.day_before + 1);
            macd_indicator = macd.calcIndex(latest_macd_indicator, macd_tmpdata);
        }else{
            macd.setFirstValueTodata(data, 0, {});
            macd_indicator = _.pick(data[data.length -1 ], macd_fields);
        }
        today_indicator = Object.assign(today_indicator, macd_indicator);

        //for rsi : rsi6, rsi12, up_avg6, up_avg12, down_avg6, down_avg12
        var rsi_fields = ["rsi6", "rsi12", "up_avg6", "up_avg12", "down_avg6", "down_avg12"];
        var latest_rsi_indicator = _.pick(indicator, rsi_fields);
        var rsi_indicator;
        if(data.length > 12){
            var rsi_tmpdata = _.takeRight(data, rsi.day_before + 1);
            rsi_indicator = rsi.calcIndex(latest_rsi_indicator, rsi_tmpdata);
        }else{
            rsi.setFirstValueTodata(data, 0, {});
            rsi_indicator = _.pick(data[data.length -1 ], rsi_fields);
        }
        today_indicator = Object.assign(today_indicator, rsi_indicator);

        return today_indicator;
    });
}


function updateoneday(){
    return Promise.each(['2330'], function(symbol_id){
    //return SymbolInfo.getValidByMarkets(markets).map(function(symbolInfo){
        //var symbol_id = symbolInfo.symbol_id;
        //console.log(symbol_id);
        return calcSymbolIndicator(symbol_id).then(function(today_indicator){
            return today_indicator;
        }).then(function(data){
            return upsertDb(data, symbol_id).catch(function(err){
                errorSymbol.db.push(symbol_id);
            }).then(function(){
                data = [];
            });
        });
    },{concurrency: 30});
}

function calcMaIndexToday(data){
    var ma_windows = [5, 10, 20, 60];
    var ma_indicator = {};
    ma_windows.forEach(function(windows){
        var tmpdata = _.takeRight(data, windows);
        if(tmpdata.length === windows){
            var field_name = 'ma' + windows;
            ma_indicator[field_name] = tmpdata.reduce( (a, b) => a + b.close, 0)/windows;
        }
    });
    return ma_indicator;
}

function calcBiasIndexToday(today_data, ma_indicator){
    var bias_windows = [5, 10, 20, 60];
    var bias_indicator = {};
    bias_windows.forEach(function(windows){
        var ma_field_name = 'ma' + windows;
        var bias_field_name = 'bias' + windows;
        bias_indicator[bias_field_name] = (today_data.close - ma_indicator[ma_field_name]) / ma_indicator[ma_field_name];
    });
    return bias_indicator;
}


function calcPsyIndexToday(data){
    var psy_windows = [12, 24];
    var psy_indicator = {};

    psy_windows.forEach(function(windows){
        var tmpdata = _.takeRight(data, windows);
        if(tmpdata.length === windows){
            var field_name = 'psy' + windows;
            var change_list = (tmpdata.map((row) => row.change)).filter((row) => row > 0);
            psy_indicator[field_name] = 100*change_list.length/tmpdata.length;
        }
    });
    return psy_indicator;
}


function calcBBIndexToday(data){
    var bb_ndays = 20;
    var interval = 2;
    var bb_indicator = {};
    var today_close = data[data.length-1].close;
    var tmpdata = _.takeRight(data, bb_ndays);
    if (tmpdata.length === bb_ndays){
        var price_list  = tmpdata.map((row) => row.close);
        var ma = price_list.reduce((a, b) => a + b, 0) / bb_ndays;
        var sigma =  Math.sqrt( price_list.reduce((a, b) => a + Math.pow((b - ma), 2), 0) / bb_ndays );
        //console.log(price_list, ma, sigma)
        bb_indicator['bb_upper'] = ma + interval * sigma;
        bb_indicator['bb_lower'] = ma - interval * sigma;
        bb_indicator['bb_percent_b'] = (today_close - bb_indicator['bb_lower']) / (2 * interval * sigma);
        bb_indicator['bb_bandwidth'] = 2 * interval * sigma / ma;
        //console.log(bb_indicator)
    }
    return bb_indicator;
}


function calcWilliamIndexToday(data){
    var william_windows = [14, 28, 42];
    var william_indicator = {}
    var today_close = data[data.length-1].close;
    william_windows.forEach(function(windows){
        var tmpdata = _.takeRight(data, windows);
        if(tmpdata.length === windows){
            var low_days =  (_.min(tmpdata, "low")).low;
            var high_days = (_.max(tmpdata, "high")).high;
            var field_name = 'william' + windows;
            william_indicator[field_name] = (high_days - today_close) / ( high_days - low_days )*-100;
        }
    });
    return william_indicator;
}

//need yesterday obv ... need to calculate from the first day 2012/01/01
function calcObvIndexToday(data){
    var obv_indicator = {};
    if (data.length === 1 ) obv_indicator['obv'] = 0;
    if (data.length < 2) return obv_indicator;
    var today_data = data[data.length-1];
    var yesterday_data = data[data.length-2];

    if(today_data.change > 0)           obv_indicator['obv'] = yesterday_data.obv + today_data.volume;
    else if (today_data.change < 0)     obv_indicator['obv'] = yesterday_data.obv - today_data.volume;
    else if (today_data.change == 0)    obv_indicator['obv'] = yesterday_data.obv;

    return obv_indicator;
}

function calcDMIIndexToday(data){
    // reference :  http://www.angelibrary.com/economic/gsjs/046.htm
    //              http://www.moneydj.com/KMDJ/wiki/wikiViewer.aspx?keyid=e1141d5c-ba75-4217-8f70-c96ed11c5c57
    //              http://creamli07.mysinablog.com/index.php?op=ViewArticle&articleId=1606411

    var dmi_indicator = {};
    var ndays = 14;
    var tmpdata = _.takeRight(data, ndays+1);
    if (tmpdata.length != (ndays+1)) return dmi_indicator;

    //calculate today +DI, -DI, DX
    var didx = calcDIDX(tmpdata);
    dmi_indicator = Object.assign({}, didx)

    //calculate today ADX
    var ndays_28 = ndays + 14;
    var tmpdata_28 = _.takeRight(data, ndays_28);
    if (tmpdata_28.length != ndays_28) return dmi_indicator;

    var didx_14 = (_.range(0, ndays)).map(function(index){
        var data_15_days = _.slice(tmpdata_28, index, index+ndays+1);
        return calcDIDX(data_15_days);
    })
    dmi_indicator['adx'] = didx_14.reduce((a, b) => a + b.dx, 0)/ndays;

    //calculate ADXR
    if (tmpdata_28[tmpdata_28.length-14].adx){
        dmi_indicator['adxr'] = (dmi_indicator['adx'] + tmpdata_28[tmpdata_28.length-14].adx) / 2;
    }

    return dmi_indicator;
}

// give 15 days data calculate +DM, -DM, TR for 14 days
function calcDIDX(data){

    var ndays = 14+1;
    var dm_tr_14 = (_.range(1, ndays)).map(function(index){
        var today_data = data[data.length-index];
        var yesterday_data = data[data.length-index-1];

        // +DM-DM
        var positive_dm = Math.max(today_data.high - yesterday_data.high, 0)
        var negtive_dm = Math.max(yesterday_data.low - today_data.low, 0)
        if (positive_dm > negtive_dm){
            negtive_dm = 0;
        }
        else if (positive_dm < negtive_dm){
            positive_dm = 0;
        }
        else if (positive_dm == negtive_dm){
            positive_dm = 0;
            negtive_dm = 0;
        }
        // ref TR
        var tr = Math.max(  Math.abs(today_data.high - today_data.low),
                            Math.abs(today_data.high - yesterday_data.close),
                            Math.abs(today_data.low - yesterday_data.close));
        return {
            'positive_dm' : positive_dm,
            'negtive_dm' : negtive_dm,
            'tr' : tr
        }
    });

    var positive_dm_14 = dm_tr_14.reduce((a, b) => a + b.positive_dm, 0);
    var negtive_dm_14 = dm_tr_14.reduce((a, b) => a + b.negtive_dm, 0);
    var tr_14 = dm_tr_14.reduce((a, b) => a + b.tr, 0);
    var pdi = 100*positive_dm_14/tr_14;
    var ndi = 100*negtive_dm_14/tr_14;
    var dx = 100*Math.abs(pdi - ndi)/(pdi + ndi);

    return {
        '+di' : pdi,
        '-di' : ndi,
        'dx' :dx
    }
}


//need yesterday sar ... need to calculate from the first day 2012/01/01
function calcSARIndexToday(data){
    var sar_indicator = {};
    var n_days = 3;
    var tmpdata = _.takeRight(data, n_days);
    if (tmpdata.length != n_days) return sar_indicator;

    var today_data = data[data.length-1];
    var yesterday_data = data[data.length-2];

    if(yesterday_data.sar){  // yesterday has sar value
        // reverse rise -> fall
        if (yesterday_data.sar_current == 'rise' && today_data.close < yesterday_data.sar){
            sar_indicator['sar_current'] = 'fall';
            sar_indicator['sar'] = yesterday_data.sar_ep;
            sar_indicator['sar_ep'] = yesterday_data.low;
            sar_indicator['sar_af'] = 0.02;
        }
        // reverse rise -> fall
        else if (yesterday_data.sar_current == 'fall' && today_data.close > yesterday_data.sar){
            sar_indicator['sar_current'] = 'rise';
            sar_indicator['sar'] = yesterday_data.sar_ep;
            sar_indicator['sar_ep'] = yesterday_data.high;
            sar_indicator['sar_af'] = 0.02;
        }
        // normal situation
        else{
            if(yesterday_data.sar_current == 'rise'){
                sar_indicator['sar_current'] = 'rise';
                if(today_data.high > yesterday_data.high){
                    sar_indicator['sar_af'] = yesterday_data.sar_af + 0.02;
                    sar_indicator['sar_af'] = (sar_indicator['sar_af'] > 0.2) ? 0.2 : sar_indicator['sar_af'];
                }else{
                    sar_indicator['sar_af'] = yesterday_data.sar_af;
                }
                sar_indicator['sar'] = yesterday_data.sar + sar_indicator['sar_af']*(yesterday_data.sar_ep - yesterday_data.sar);
                sar_indicator['sar_ep'] = (yesterday_data.high > yesterday_data.sar_ep) ? yesterday_data.high : yesterday_data.sar_ep;
            }else{
                sar_indicator['sar_current'] = 'fall';
                if(today_data.low < yesterday_data.low){
                    sar_indicator['sar_af'] =yesterday_data.sar_af + 0.02;
                    sar_indicator['sar_af'] = (sar_indicator['sar_af'] > 0.2) ? 0.2 : sar_indicator['sar_af'];
                }else{
                    sar_indicator['sar_af'] = yesterday_data.sar_af;
                }
                sar_indicator['sar'] = yesterday_data.sar + sar_indicator['sar_af']*(yesterday_data.sar_ep - yesterday_data.sar);
                sar_indicator['sar_ep'] = (yesterday_data.low < yesterday_data.sar_ep) ? yesterday_data.low : yesterday_data.sar_ep;
            }
        }
    }else{// yesterday has no value
        var three_days = tmpdata;

        var three_days_change_rate = three_days.map((row) => (row.change_rate > 0));
        var check_stat = _.countBy(three_days_change_rate, (row) => row == true);
        if (check_stat['true'] == 3){       //rise
            sar_indicator['sar'] = _.min(three_days.map((row) => row.low));
            sar_indicator['sar_ep'] = _.max(three_days.map((row) => row.high));
            sar_indicator['sar_current'] = 'rise';
            sar_indicator['sar_af'] = 0.02;
        }else if(check_stat['false'] == 3){ //fall
            sar_indicator['sar'] = _.max(three_days.map((row) => row.high));
            sar_indicator['sar_ep'] = _.min(three_days.map((row) => row.low));
            sar_indicator['sar_current'] = 'fall';
            sar_indicator['sar_af'] = 0.02;
        }
    }

    return sar_indicator;
}





function upsertDb(data, symbol_id){
    //console.log(data,symbol_id);
    // if(data){
    //     data.forEach(function(row){
    //         row.symbol_id = symbol_id;
    //     });
    //
    //     return  StockIndicator.insertMany(data);
    // }else{
    //     return Promise.resolve("");
    // }
        //console.log(row)

    // return StockIndicator.update({
    //     symbol_id : symbol_id,
    //     date : new Date(data.date)
    // }, data, {upsert: true}).exec();
    console.log(data)
    return Promise.resolve("");
}




function groupUpdateDB(data){
    var groupData = _.groupBy(data, function(row){
        return new Date(row.date).getFullYear();
    });

    var promiseArr = [];
    for (var key in groupData){
        promiseArr.push( Stock.updateYearData(symbol_id, key, groupData[key]));
    }
    return Promise.all(promiseArr).then(function(){
        console.log(symbol_id,"done");
        return;
    });
}



if(require.main === module){
    updateoneday().then(function(){
        console.log(errorSymbol);
        mongoose.disconnect();
    });
}



module.exports = {calcDIDX}