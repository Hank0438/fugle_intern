// libraries
var moment = require('moment');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var kd = require('./technical/kd');
var macd = require('./technical/macd');
var rsi = require('./technical/rsi');
var _ = require('lodash');
var calcDIDX = require('./add_technical_index_oneday').calcDIDX;

// db connection
var config = require('../config');
var connections = require('../config/connections')('fugle', ['technical', 'search']);

// past index data
var techData = require('./tech.json');

var techDataMap = {};
var startDate = moment(new Date(2012, 6, 3)).toDate();
// techData = techData.slice(0,10);

var Stock = connections.models.tw_stock_price;
var StockIndicator = connections.models.stock_indicator;
var SymbolInfo = connections.models.symbol_info;
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
    dmi: [],
    sar: []
};
// get stock list
var markets = ['tw.tse', 'tw.otc', 'tw.emg', 'tw.etf'];
               // , 'tw.otc', 'tw.emg', 'tw.etf'];
mongoose.Promise = Promise;
techData.forEach((row) => {
    techDataMap[row.LIST_CODE] = row;
});


function calcMaBiasIndex(data) {
    var maWindows = [5, 10, 20, 60];
    var ma = {};
    var bias = {};
    var returnData = Object.assign({}, data);
    maWindows.forEach((windows) => {
        ma[windows] = 0.0;
        bias[windows] = 0.0;
    });

    data.forEach((row, index) => {
        maWindows.forEach((windows) => {
            ma[windows] += row.close / windows;
            if (index >= windows) {
                ma[windows] -= data[index - windows].close / windows;
            }
            if (index >= windows - 1) {
                const maFieldName = `ma${windows}`;
                const biasFieldName = `bias${windows}`;
                // row[maFieldName] = ma[windows];
                // row[biasFieldName] = (row.close - ma[windows]) / ma[windows];
                returnData[index][maFieldName] = ma[windows];
                returnData[index][biasFieldName] = (row.close - ma[windows]) / ma[windows];
            }
        });
    });
    return returnData;
}

function calcPsyIndex(data) {
    var psyWindows = [12, 24];
    var psy = {};
    var returnData = Object.assign({}, data);
    psyWindows.forEach((windows) => { psy[windows] = 0.0; });
    data.forEach((row, index) => {
        // console.log(row.date + "price : "+row.close);
        // console.log(row.date + "change : "+row.change);

        psyWindows.forEach((windows) => {
            if (row.change > 0) {
                psy[windows] += 100 / windows;
            }
            if (index >= windows && data[index - windows].change > 0) { // 逐日改變psy的值
                psy[windows] -= 100 / windows;
            }
            if (index >= windows - 1) { // 將psy的值寫入每天
                const fieldName = `psy${windows}`;
                // row[fieldName] = psy[windows];
                returnData[index][fieldName] = psy[windows];
                // console.log(row.date + fieldName + " : " + row[fieldName]);
            }
        });
    });
    return returnData;
}

function calcBBIndex(data) {
    var bbNDays = 20;
    var interval = 2;
    var returnData = Object.assign({}, data);
    data.forEach((row, index) => {
        if (index >= bbNDays - 1) {
            const todayClose = data[index].close;
            const tmpdata = _.slice(data, (index - bbNDays) + 1, index + 1);
            if (tmpdata.length === bbNDays) {
                const priceList = tmpdata.map(tmprow => tmprow.close);
                const ma = priceList.reduce((a, b) => a + b, 0) / bbNDays;
                const sigma = Math.sqrt(priceList.reduce((a, b) => a + ((b - ma) ** 2), 0)
                                / bbNDays);
                // const todayData = data[data.length - 1];
                // console.log(priceList, ma, sigma)

                // row.bb_upper = ma + interval * sigma;
                // row.bb_lower = ma - interval * sigma;
                // row.bb_percent_b = (todayClose - row.bb_lower) / (2 * interval * sigma);
                // row.bb_bandwidth = 2 * interval * sigma / ma;
                returnData[index].bb_upper = ma + (interval * sigma);
                returnData[index].bb_lower = ma - (interval * sigma);
                returnData[index].bb_percent_b = (todayClose - row.bb_lower)
                                                    / (2 * interval * sigma);
                returnData[index].bb_bandwidth = (2 * interval * sigma) / ma;
            }
        }
    });
    return returnData;
}

function calcWilliamIndex(data) {
    var todayData = [14, 28, 42];
    var william = {};
    var returnData = Object.assign({}, data);
    todayData.forEach((windows) => { william[windows] = 0.0; });
    data.forEach((row, index) => {
        // console.log(row.date + "price : "+row.close);
        todayData.forEach((windows) => {
            if (index >= windows - 1) { // 將william的值寫入每天
                const days = data.slice((index + 1) - windows, index + 1);
                const low9days = (_.min(days, 'low')).low;
                const high9days = (_.max(days, 'high')).high;
                william[windows] = ((high9days - data[index].close) /
                                    (high9days - low9days)) * -100;
                const fieldName = `william${windows}`;
                // row[fieldName] = william[windows];
                returnData[index][fieldName] = william[windows];
                // console.log(row.date + fieldName + " : " + row[fieldName]);
            }
        });
    });
    return returnData;
}

function calcObvIndex(data) {
    var obv = 0;
    var returnData = Object.assign({}, data);
    data.forEach((row, index) => {
        // console.log(row.date);
        // console.log("change : "+row.change);
        // console.log("volume : "+row.volume);
        if (row.change > 0) obv += row.volume;
        else if (row.change < 0) obv -= row.volume;
        // console.log("obv : "+obv);
        // console.log("====================================");
        // row.obv = obv;
        returnData[index].obv = obv;
    });
    return returnData;
}

function calcDMIIndex(data) {
    var ndays = 14;
    var ndays28 = 28;
    var returnData = Object.assign({}, data);
    data.forEach((row, index) => {
        if (index >= ndays) {
            const tmpdata = _.slice(data, index - ndays, index + 1);
            const didx = calcDIDX(tmpdata);
            // row['+di'] = didx['+di'];
            // row['-di'] = didx['-di'];
            // row.dx = didx.dx;
            returnData[index]['+di'] = didx['+di'];
            returnData[index]['-di'] = didx['-di'];
            returnData[index].dx = didx.dx;

            if (index >= ndays28 - 1) {
                const tmpdata28 = _.slice(data, (index - ndays28) + 1, index + 1);
                const didx14 = (_.range(0, ndays)).map((index2) => {
                    var data15days = _.slice(tmpdata28, index2, index2 + ndays + 1);
                    return calcDIDX(data15days);
                });
                // row.adx = didx14.reduce((a, b) => a + b.dx, 0) / ndays;
                returnData[index].adx = didx14.reduce((a, b) => a + b.dx, 0) / ndays;
                if (tmpdata28[tmpdata28.length - 14].adx) {
                    // row.adxr = (row.adx + tmpdata28[tmpdata28.length - 14].adx) / 2;
                    returnData[index].adxr = (row.adx + tmpdata28[tmpdata28.length - 14].adx) / 2;
                }
            }
        }
    });
    return returnData;
}


function calcSARIndex(data) {
    // https://www.moneydj.com/KMDJ/Wiki/wikiViewer.aspx?keyid=ea368946-3325-46b0-8c67-eead6baafec7
    // https://zh.wikipedia.org/wiki/%E6%8B%8B%E7%89%A9%E7%B7%9A%E6%8C%87%E6%A8%99
    // http://www.angelibrary.com/economic/gsjs/054.htm
    var returnData = Object.assign({}, data);
    data.forEach((row, index) => {
        if (index >= 2) {
            if (data[index - 1].sar) {  // yesterday has sar value
                // reverse rise -> fall
                if (data[index - 1].sar_current === 'rise' && data[index].close < data[index - 1].sar) {
                    // row.sar_current = 'fall';
                    // row.sar = data[index - 1].sar_ep;
                    // row.sar_ep = data[index - 1].low;
                    // row.sar_af = 0.02;
                    returnData[index].sar_current = 'fall';
                    returnData[index].sar = data[index - 1].sar_ep;
                    returnData[index].sar_ep = data[index - 1].low;
                    returnData[index].sar_af = 0.02;
                } else if (data[index - 1].sar_current === 'fall' && data[index].close > data[index - 1].sar) {
                    // reverse rise -> fall
                    // row.sar_current = 'rise';
                    // row.sar = data[index - 1].sar_ep;
                    // row.sar_ep = data[index - 1].high;
                    // row.sar_af = 0.02;
                    returnData[index].sar_current = 'rise';
                    returnData[index].sar = data[index - 1].sar_ep;
                    returnData[index].sar_ep = data[index - 1].high;
                    returnData[index].sar_af = 0.02;
                } else if (data[index - 1].sar_current === 'rise') {
                    // normal situation
                    // row.sar_current = 'rise';
                    returnData[index].sar_current = 'rise';
                    if (data[index].high > data[index - 1].high) {
                        // row.sar_af = data[index - 1].sar_af + 0.02;
                        // row.sar_af = (row.sar_af > 0.2) ? 0.2 : row.sar_af;
                        returnData[index].sar_af = data[index - 1].sar_af + 0.02;
                        returnData[index].sar_af = (returnData[index].sar_af > 0.2) ?
                                                    0.2 : returnData[index].sar_af;
                    } else {
                        // row.sar_af = data[index - 1].sar_af;
                        returnData[index].sar_af = data[index - 1].sar_af;
                    }
                    // row.sar = data[index - 1].sar + row.sar_af *
                    //              (data[index - 1].sar_ep - data[index - 1].sar);
                    // row.sar_ep = (data[index - 1].high > data[index - 1].sar_ep) ?
                    //              data[index - 1].high : data[index - 1].sar_ep;
                    returnData[index].sar = data[index - 1].sar + (returnData[index].sar_af *
                                (data[index - 1].sar_ep - data[index - 1].sar));
                    returnData[index].sar_ep = (data[index - 1].high > data[index - 1].sar_ep) ?
                                data[index - 1].high : data[index - 1].sar_ep;
                } else {
                    // row.sar_current = 'fall';
                    returnData[index].sar_current = 'fall';
                    if (data[index].low < data[index - 1].low) {
                        // row.sar_af = data[index - 1].sar_af + 0.02;
                        // row.sar_af = (row.sar_af > 0.2) ? 0.2 : row.sar_af;
                        returnData[index].sar_af = data[index - 1].sar_af + 0.02;
                        returnData[index].sar_af = (row.sar_af > 0.2) ?
                                                    0.2 : returnData[index].sar_af;
                    } else {
                        // row.sar_af = data[index - 1].sar_af;
                        returnData[index].sar_af = data[index - 1].sar_af;
                    }
                    // row.sar = data[index - 1].sar + row.sar_af *
                    //          (data[index - 1].sar_ep - data[index - 1].sar);
                    // row.sar_ep = (data[index - 1].low < data[index - 1].sar_ep) ?
                    //           data[index - 1].low : data[index - 1].sar_ep;
                    returnData[index].sar = data[index - 1].sar + (returnData[index].sar_af *
                                        (data[index - 1].sar_ep - data[index - 1].sar));
                    returnData[index].sar_ep = (data[index - 1].low < data[index - 1].sar_ep) ?
                                        data[index - 1].low : data[index - 1].sar_ep;
                }
            } else { // yesterday has no value
                const threeDays = _.slice(data, index - 2, index + 1);
                const threeDaysChangeRate = threeDays.map(tmprow => (tmprow.change_rate > 0));
                const checkStat = _.countBy(threeDaysChangeRate, tmprow => tmprow === true);
                if (checkStat.true === 3) {       // rise
                    // row.sar = _.min(threeDays.map(row => row.low));
                    // row.sar_ep = _.max(threeDays.map(row => row.high));
                    // row.sar_current = 'rise';
                    // row.sar_af = 0.02;
                    returnData[index].sar = _.min(threeDays.map(tmprow => tmprow.low));
                    returnData[index].sar_ep = _.max(threeDays.map(tmprow => tmprow.high));
                    returnData[index].sar_current = 'rise';
                    returnData[index].sar_af = 0.02;
                } else if (checkStat.false === 3) { // fall
                    // row.sar = _.max(threeDays.map(row => row.high));
                    // row.sar_ep = _.min(threeDays.map(row => row.low));
                    // row.sar_current = 'fall';
                    // row.sar_af = 0.02;
                    returnData[index].sar = _.max(threeDays.map(tmprow => tmprow.high));
                    returnData[index].sar_ep = _.min(threeDays.map(tmprow => tmprow.low));
                    returnData[index].sar_current = 'fall';
                    returnData[index].sar_af = 0.02;
                }
            }
        }
    });
    return returnData;
}


function calcTechIndex(data, technical, techDataMapLocal, symbolId) {
    var prevIndex = technical.genInitVal(techDataMapLocal, symbolId);
    var startIdex = _.findIndex(data, (row) => {
        var tmpDate = new Date(row.date);
        return tmpDate >= startDate && tmpDate <= startDate;
    });

    if (startIdex < technical.day_before) { // no data, start from 8 days later
        startIdex = technical.day_before;
    }

    const tmpvalue = technical.setFirstValueTodata(data, startIdex, prevIndex);
    startIdex = tmpvalue.start_idx;
    prevIndex = tmpvalue.prev_index;
    for (let i = startIdex; i < data.length; i += 1) {
        // console.log(i,i-technical.day_before, i+1, data.length)
        // console.log(data[i])
        const tmp = data.slice(i - technical.day_before, i + 1); // include itself
        prevIndex = technical.calcIndex(prevIndex, tmp);
        technical.setValueTodata(data[i], prevIndex);
    }
}


function upsertDb(data, symbolId) {
    // if(data){
    //     data.forEach(function(row){
    //         row.symbolId = symbolId;
    //     });
    //
    //     return  StockIndicator.insertMany(data);
    // }else{
    //     return Promise.resolve("");
    // }

    console.log(data);
    return Promise.resolve('');

    // return Promise.each(data, function(row){
    //     //console.log(row)
    //     return StockIndicator.update({
    //         symbolId : symbolId,
    //         date : new Date(row.date)
    //     }, row);
    // });
}


// function groupUpdateDB(data) {
//     var groupData = _.groupBy(data, (row) => {
//         return new Date(row.date).getFullYear();
//     });
//
//     var promiseArr = [];
//     for (var key in groupData) {
//         promiseArr.push(Stock.updateYearData(symbolId, key, groupData[key]));
//     }
//     return Promise.all(promiseArr).then(() => {
//         console.log(symbolId, 'done');
//     });
// }


// SymbolInfo.getValidByMarkets(markets).each(function(symbolInfo){
Promise.each(['2330'], (symbolId) => {
    // var symbolId = symbolInfo.symbolId;
    // console.log(symbolId);
    // var symbolId = 4536;
    return Stock.get5yRaw(symbolId).then((data) => {
        // if(data.length < 35){
        //     return Promise.resolve();
        // }

        try { // for kd : k9, d9
            calcTechIndex(data, kd, techDataMap, symbolId);
        } catch (e) {
            errorSymbol.kd.push(symbolId);
        }
        try { // for macd : ema12, ema26 , macd12_26
            calcTechIndex(data, macd, techDataMap, symbolId);
        } catch (e) {
            errorSymbol.macd.push(symbolId);
        }
        try { // for rsi : rsi6, rsi12, up_avg6, up_avg12, down_avg6, down_avg12
            calcTechIndex(data, rsi, techDataMap, symbolId);
        } catch (e) {
            errorSymbol.rsi.push(symbolId);
        }
        try { // for bias : bias5, bias10, bias20, bias60
            calcMaBiasIndex(data);
        } catch (e) {
            errorSymbol.ma_bias.push(symbolId);
        }
        try { // for psy : psy12, psy24
            calcPsyIndex(data);
        } catch (e) {
            errorSymbol.psy.push(symbolId);
        }
        try { // for bollinger band : bb_upper, bb_lower, bb_percent_b, bb_bandwidth
            calcBBIndex(data);
        } catch (e) {
            errorSymbol.bb.push(symbolId);
        }
        try { // for william : william14, william28, william42
            calcWilliamIndex(data);
        } catch (e) {
            errorSymbol.william.push(symbolId);
        }
        try { // for obv : obv
            calcObvIndex(data);
        } catch (e) {
            errorSymbol.obv.push(symbolId);
        }
        try { // for dmi : +di, -di, dx, adx, adxr
            calcDMIIndex(data);
        } catch (e) {
            errorSymbol.dmi.push(symbolId);
        }
        try { // for sar : sar_current, sar_af, sar, sar_ep
            calcSARIndex(data);
        } catch (e) {
            errorSymbol.sar.push(symbolId);
        }

        return upsertDb(data, symbolId).catch((err) => {
            console.log(err);
            errorSymbol.db.push(symbolId);
        }).then(() => {
            // data = [];
        });
        // return groupUpdateDB(data);
    });
})
.then(() => {
    console.log(errorSymbol);
    mongoose.disconnect();
});
