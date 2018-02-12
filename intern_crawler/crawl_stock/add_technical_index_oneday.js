// libraries
// var moment = require('moment');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var _ = require('lodash');

// db connection
// var config = require('../config');
var connections = require('../config/connections')('fugle', ['technical', 'search']);

var kd = require('./technical/kd');
var macd = require('./technical/macd');
var rsi = require('./technical/rsi');

var errorSymbol = {
    kd: [],
    macd: [],
    rsi: [],
    ma_bias: [],
    psy: [],
    bb: [],
    william: [],
    obv: [],
    db: [],
    sar: []
};

// get stock list
// var markets = ['tw.tse', 'tw.otc', 'tw.emg', 'tw.etf'];
var Stock = connections.models.tw_stock_price;
var StockIndicator = connections.models.stock_indicator;
// var SymbolInfo = connections.models.symbol_info;
mongoose.Promise = Promise;


function calcMaIndexToday(data) {
    var maWindows = [5, 10, 20, 60];
    var maIndicator = {};
    maWindows.forEach((windows) => {
        var tmpdata = _.takeRight(data, windows);
        if (tmpdata.length === windows) {
            const fieldName = `ma${windows}`;
            maIndicator[fieldName] = tmpdata.reduce((a, b) => a + b.close, 0) / windows;
        }
    });
    return maIndicator;
}

function calcBiasIndexToday(todayData, maIndicator) {
    var biasWindows = [5, 10, 20, 60];
    var biasIndicator = {};
    biasWindows.forEach((windows) => {
        var maFieldName = `ma${windows}`;
        var biasFieldName = `bias${windows}`;
        biasIndicator[biasFieldName] = (todayData.close - maIndicator[maFieldName])
                                        / maIndicator[maFieldName];
    });
    return biasIndicator;
}


function calcPsyIndexToday(data) {
    var psyWindows = [12, 24];
    var psyIndicator = {};

    psyWindows.forEach((windows) => {
        var tmpdata = _.takeRight(data, windows);
        if (tmpdata.length === windows) {
            const fieldName = `psy${windows}`;
            const changeList = (tmpdata.map(row => row.change)).filter(row => row > 0);
            psyIndicator[fieldName] = (100 * changeList.length) / tmpdata.length;
        }
    });
    return psyIndicator;
}


function calcBBIndexToday(data) {
    var bbNDays = 20;
    var interval = 2;
    var bbIndicator = {};
    var todayClose = data[data.length - 1].close;
    var tmpdata = _.takeRight(data, bbNDays);
    if (tmpdata.length === bbNDays) {
        const priceList = tmpdata.map(row => row.close);
        const ma = priceList.reduce((a, b) => a + b, 0) / bbNDays;
        const sigma = Math.sqrt(priceList.reduce((a, b) => a + ((b - ma) ** 2), 0) / bbNDays);
        // console.log(priceList, ma, sigma)
        bbIndicator.bb_upper = ma + (interval * sigma);
        bbIndicator.bb_lower = ma - (interval * sigma);
        bbIndicator.bb_percent_b = (todayClose - bbIndicator.bb_lower) / (2 * interval * sigma);
        bbIndicator.bb_bandwidth = (2 * interval * sigma) / ma;
        // console.log(bbIndicator)
    }
    return bbIndicator;
}


function calcWilliamIndexToday(data) {
    var williamWindows = [14, 28, 42];
    var williamIndicator = {};
    var todayClose = data[data.length - 1].close;
    williamWindows.forEach((windows) => {
        var tmpdata = _.takeRight(data, windows);
        if (tmpdata.length === windows) {
            const lowDays = (_.min(tmpdata, 'low')).low;
            const highDays = (_.max(tmpdata, 'high')).high;
            const fieldName = `william${windows}`;
            williamIndicator[fieldName] = ((highDays - todayClose) / (highDays - lowDays)) * -100;
        }
    });
    return williamIndicator;
}

// need yesterday obv ... need to calculate from the first day 2012/01/01
function calcObvIndexToday(data) {
    var obvIndicator = {};
    if (data.length === 1) obvIndicator.obv = 0;
    if (data.length < 2) return obvIndicator;
    const todayData = data[data.length - 1];
    const yesterdayData = data[data.length - 2];

    if (todayData.change > 0) obvIndicator.obv = yesterdayData.obv + todayData.volume;
    else if (todayData.change < 0) obvIndicator.obv = yesterdayData.obv - todayData.volume;
    else if (todayData.change === 0) obvIndicator.obv = yesterdayData.obv;

    return obvIndicator;
}


// give 15 days data calculate +DM, -DM, TR for 14 days
function calcDIDX(data) {
    var ndays = 14 + 1;
    var dmtr14 = (_.range(1, ndays)).map((index) => {
        var todayData = data[data.length - index];
        var yesterdayData = data[data.length - index - 1];

        // +DM-DM
        var positiveDM = Math.max(todayData.high - yesterdayData.high, 0);
        var negtiveDM = Math.max(yesterdayData.low - todayData.low, 0);
        if (positiveDM > negtiveDM) {
            negtiveDM = 0;
        } else if (positiveDM < negtiveDM) {
            positiveDM = 0;
        } else if (positiveDM === negtiveDM) {
            positiveDM = 0;
            negtiveDM = 0;
        }
        // ref TR
        const tr = Math.max(Math.abs(todayData.high - todayData.low),
                            Math.abs(todayData.high - yesterdayData.close),
                            Math.abs(todayData.low - yesterdayData.close));
        return {
            positiveDM: positiveDM,
            negtiveDM: negtiveDM,
            tr: tr
        };
    });

    var positiveDM14 = dmtr14.reduce((a, b) => a + b.positiveDM, 0);
    var negtiveDM14 = dmtr14.reduce((a, b) => a + b.negtiveDM, 0);
    var TR14 = dmtr14.reduce((a, b) => a + b.tr, 0);
    var pdi = (100 * positiveDM14) / TR14;
    var ndi = (100 * negtiveDM14) / TR14;
    var dx = (100 * Math.abs(pdi - ndi)) / (pdi + ndi);

    return {
        '+di': pdi,
        '-di': ndi,
        dx: dx
    };
}

function calcDMIIndexToday(data) {
    // reference :  http://www.angelibrary.com/economic/gsjs/046.htm
    //              http://www.moneydj.com/KMDJ/wiki/wikiViewer.aspx?keyid=e1141d5c-ba75-4217-8f70-c96ed11c5c57
    //              http://creamli07.mysinablog.com/index.php?op=ViewArticle&articleId=1606411

    var dmiIndicator = {};
    var ndays = 14;
    var ndays28 = ndays + 14;
    var tmpdata28 = _.takeRight(data, ndays28);
    var tmpdata = _.takeRight(data, ndays + 1);
    if (tmpdata.length !== (ndays + 1)) return dmiIndicator;

    // calculate today +DI, -DI, DX
    const didx = calcDIDX(tmpdata);
    dmiIndicator = Object.assign({}, didx);

    // calculate today ADX
    if (tmpdata28.length !== ndays28) return dmiIndicator;

    const didx14 = (_.range(0, ndays)).map((index) => {
        var data15Days = _.slice(tmpdata28, index, index + ndays + 1);
        return calcDIDX(data15Days);
    });
    dmiIndicator.adx = didx14.reduce((a, b) => a + b.dx, 0) / ndays;

    // calculate ADXR
    if (tmpdata28[tmpdata28.length - 14].adx) {
        dmiIndicator.adxr = (dmiIndicator.adx + tmpdata28[tmpdata28.length - 14].adx) / 2;
    }
    return dmiIndicator;
}


// need yesterday sar ... need to calculate from the first day 2012/01/01
function calcSARIndexToday(data) {
    var sarIndicator = {};
    var ndays = 3;
    var tmpdata = _.takeRight(data, ndays);
    if (tmpdata.length !== ndays) return sarIndicator;

    const todayData = data[data.length - 1];
    const yesterdayData = data[data.length - 2];

    if (yesterdayData.sar) {  // yesterday has sar value
        // reverse rise -> fall
        if (yesterdayData.sar_current === 'rise' && todayData.close < yesterdayData.sar) {
            sarIndicator.sar_current = 'fall';
            sarIndicator.sar = yesterdayData.sar_ep;
            sarIndicator.sar_ep = yesterdayData.low;
            sarIndicator.sar_af = 0.02;
        } else if (yesterdayData.sar_current === 'fall' && todayData.close > yesterdayData.sar) {
            // reverse rise -> fall
            sarIndicator.sar_current = 'rise';
            sarIndicator.sar = yesterdayData.sar_ep;
            sarIndicator.sar_ep = yesterdayData.high;
            sarIndicator.sar_af = 0.02;
        } else if (yesterdayData.sar_current === 'rise') {
            // normal situation
            sarIndicator.sar_current = 'rise';
            if (todayData.high > yesterdayData.high) {
                sarIndicator.sar_af = yesterdayData.sar_af + 0.02;
                sarIndicator.sar_af = (sarIndicator.sar_af > 0.2) ? 0.2 : sarIndicator.sar_af;
            } else {
                sarIndicator.sar_af = yesterdayData.sar_af;
            }
            sarIndicator.sar = yesterdayData.sar + (sarIndicator.sar_af *
                                (yesterdayData.sar_ep - yesterdayData.sar));
            sarIndicator.sar_ep = (yesterdayData.high > yesterdayData.sar_ep) ?
                                yesterdayData.high : yesterdayData.sar_ep;
        } else {
            sarIndicator.sar_current = 'fall';
            if (todayData.low < yesterdayData.low) {
                sarIndicator.sar_af = yesterdayData.sar_af + 0.02;
                sarIndicator.sar_af = (sarIndicator.sar_af > 0.2) ? 0.2 : sarIndicator.sar_af;
            } else {
                sarIndicator.sar_af = yesterdayData.sar_af;
            }
            sarIndicator.sar = yesterdayData.sar + (sarIndicator.sar_af *
                                (yesterdayData.sar_ep - yesterdayData.sar));
            sarIndicator.sar_ep = (yesterdayData.low < yesterdayData.sar_ep) ?
                                yesterdayData.low : yesterdayData.sar_ep;
        }
    } else { // yesterday has no value
        const threeDays = tmpdata;
        const threeDaysChangeRate = threeDays.map(row => (row.change_rate > 0));
        const checkStat = _.countBy(threeDaysChangeRate, row => row === true);
        if (checkStat.true === 3) {       // rise
            sarIndicator.sar = _.min(threeDays.map(row => row.low));
            sarIndicator.sar_ep = _.max(threeDays.map(row => row.high));
            sarIndicator.sar_current = 'rise';
            sarIndicator.sar_af = 0.02;
        } else if (checkStat.false === 3) { // fall
            sarIndicator.sar = _.max(threeDays.map(row => row.high));
            sarIndicator.sar_ep = _.min(threeDays.map(row => row.low));
            sarIndicator.sar_current = 'fall';
            sarIndicator.sar_af = 0.02;
        }
    }
    return sarIndicator;
}


function upsertDb(data, symbolId) {
    // console.log(data,symbolId);
    // if(data){
    //     data.forEach(function(row){
    //         row.symbolId = symbolId;
    //     });
    //
    //     return  StockIndicator.insertMany(data);
    // }else{
    //     return Promise.resolve("");
    // }
        // console.log(row)

    // return StockIndicator.update({
    //     symbolId : symbolId,
    //     date : new Date(data.date)
    // }, data, {upsert: true}).exec();
    console.log(symbolId, data);
    return Promise.resolve('');
}


// function groupUpdateDB(data) {
//     var groupData = _.groupBy(data, (row) => {
//         return new Date(row.date).getFullYear();
//     });
//     var promiseArr = [];
//     let key;
//     for (key in groupData) {
//         if (groupData.key) {
//             promiseArr.push(Stock.updateYearData(symbolId, key, groupData[key]));
//         }
//     }
//     return Promise.all(promiseArr).then(() => {
//         console.log(symbolId, 'done');
//     });
// }


function calcSymbolIndicator(symbolId) {
    return Promise.all([
        Stock.get60(symbolId),
        StockIndicator.find({
            symbol_id: symbolId
        }).sort('-date').limit(14).exec()
    ]).spread((data, indicators) => {
        var todayData = data[data.length - 1];
        var todayIndicator = {
            date: todayData.date,
            symbol_id: symbolId
        };

        // no current indicator
        const newIndicators = indicators.filter(row => row.date < todayData.date);
        const indicator = newIndicators[0] || {};

        // for ma: ma5, ma10, ma20, ma60
        const maIndicator = calcMaIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, maIndicator);

        // for bias : bias5, bias10, bias20, bias60
        const biasIndicator = calcBiasIndexToday(todayData, maIndicator);
        todayIndicator = Object.assign(todayIndicator, biasIndicator);

        // for psy : psy12, psy24
        const psyIndicator = calcPsyIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, psyIndicator);

        // for bollinger band : bb_upper, bb_lower, bb_percent_b, bb_bandwidth
        const bbIndicator = calcBBIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, bbIndicator);

        // for william : william14, william28, william42
        const williamIndicator = calcWilliamIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, williamIndicator);

        // for obv : obv
        const obvIndicator = calcObvIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, obvIndicator);

        // for dmi : +di, -di, dx, adx, adxr
        const dmiIndicator = calcDMIIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, dmiIndicator);

        // for sar : sar_current, sar_af, sar, sar_ep
        const sarIndicator = calcSARIndexToday(data);
        todayIndicator = Object.assign(todayIndicator, sarIndicator);

        // for kd : k9, d9
        const latestKDIndicator = {
            k: indicator.k9 || 50,
            d: indicator.d9 || 50
        };
        const kdTmpData = _.takeRight(data, kd.day_before + 1);
        if (kdTmpData.length === kd.day_before + 1) {
            const kdIndicator = kd.calcIndex(latestKDIndicator, kdTmpData);
            todayIndicator.k9 = kdIndicator.k;
            todayIndicator.d9 = kdIndicator.d;
        }

        // for macd : ema12, ema26 , macd12_26
        const macdFields = ['ema12', 'ema26', 'macd12_26'];
        const latestMACDIndicator = _.pick(indicator, macdFields);
        let macdIndicator = {};
        if (data.length > 34) {
            const macdTmpData = _.takeRight(data, macd.day_before + 1);
            macdIndicator = macd.calcIndex(latestMACDIndicator, macdTmpData);
        } else {
            macd.setFirstValueTodata(data, 0, {});
            macdIndicator = _.pick(data[data.length - 1], macdFields);
        }
        todayIndicator = Object.assign(todayIndicator, macdIndicator);

        // for rsi : rsi6, rsi12, up_avg6, up_avg12, down_avg6, down_avg12
        const rsiFields = ['rsi6', 'rsi12', 'up_avg6', 'up_avg12', 'down_avg6', 'down_avg12'];
        const latestRSIIndicator = _.pick(indicator, rsiFields);
        let rsiIndicator = {};
        if (data.length > 12) {
            const rsiTmpData = _.takeRight(data, rsi.day_before + 1);
            rsiIndicator = rsi.calcIndex(latestRSIIndicator, rsiTmpData);
        } else {
            rsi.setFirstValueTodata(data, 0, {});
            rsiIndicator = _.pick(data[data.length - 1], rsiFields);
        }
        todayIndicator = Object.assign(todayIndicator, rsiIndicator);

        return todayIndicator;
    });
}


function updateoneday() {
    return Promise.each(['2330'], (symbolId) => {
    // return SymbolInfo.getValidByMarkets(markets).map(function(symbolInfo){
        // var symbolId = symbolInfo.symbolId;
        // console.log(symbolId);
        return calcSymbolIndicator(symbolId).then((todayIndicator) => {
            return todayIndicator;
        }).then((data) => {
            return upsertDb(data, symbolId).catch((err) => {
                console.log(err);
                errorSymbol.db.push(symbolId);
            }).then(() => {
                // data = [];
            });
        });
    }, { concurrency: 30 });
}

if (require.main === module) {
    updateoneday().then(() => {
        console.log(errorSymbol);
        mongoose.disconnect();
    });
}

module.exports = { calcDIDX };
