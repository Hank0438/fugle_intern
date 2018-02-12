var _ = require('lodash');

var dayBefore = 1;

function setValueTodata(data, value) {
    var newData = Object.assign({}, data);
    newData.ema12 = value.ema12;
    newData.ema26 = value.ema26;
    newData.macd1226 = value.macd1226;
}

function calcEma(val, prevVal, n) {
    var tmpPrevVal = prevVal || 0;
    var alpha = 2 / (n + 1);
    return ((val - tmpPrevVal) * alpha) + tmpPrevVal;
}

function avg(data, type) {
    return data.reduce((accu, val) => {
        return accu + val[type];
    }, 0) / data.length;
}

function setFirstValueTodata(data, startIdex, value) {
    // ema12,ema26,macd1226
    var newData = Object.assign({}, data);
    if ('macd1226' in value) {
        newData[startIdex - 1].ema12 = value.ema12;
        newData[startIdex - 1].ema26 = value.ema26;
        newData[startIdex - 1].macd1226 = value.macd1226;
        return { startIdex, prevIndex: value };
    }

    // ema 12
    // change close to pseudo close
    const tmpData = _.cloneDeep(data.slice(0, 34));

    // tmpData.forEach(function(row){
    //     row.tmpClose = (row.close*2+row.high+row.low)/4;
    // });

    // data[11].ema12 = avg(tmpData.slice(0,12), 'tmpClose');
    // for(var i = 12; i<34 ; i++){
    //     data[i].ema12 = calcEma(tmpData[i].tmpClose, data[i-1].ema12, 12);
    // }

    // data[25].ema26 = avg(tmpData.slice(0,26), 'tmpClose');
    // var tmp = [{ val: data[25].ema26 - data[25].ema12}];
    // for(var i = 26; i<34 ; i++){
    //     data[i].ema26 = calcEma(tmpData[i].tmpClose, data[i-1].ema26, 26);
    //     tmp.push({ val: data[i].ema26 - data[i].ema12});
    // }
    // data[33].macd1226 = avg(tmp,"val");

    const tmp = [];
    let idx = 0;
    const prevIndex = {};
    tmpData.forEach((row, i) => {
        tmpData[i].tmpClose = ((row.close * 2) + row.high + row.low) / 4;
        if (i === 11) {
            newData[i].ema12 = avg(tmpData.slice(0, 12), 'tmpClose');
            prevIndex.ema12 = data[i].ema12;
        } else if (i > 11) {
            newData[i].ema12 = calcEma(tmpData[i].tmpClose, data[i - 1].ema12, 12);
            prevIndex.ema12 = data[i].ema12;
        }

        if (i === 25) {
            newData[i].ema26 = avg(tmpData.slice(0, 26), 'tmpClose');
            prevIndex.ema26 = data[i].ema26;
            tmp.push({ val: data[i].ema26 - data[i].ema12 });
        } else if (i > 25) {
            newData[i].ema26 = calcEma(tmpData[i].tmpClose, data[i - 1].ema26, 26);
            prevIndex.ema26 = data[i].ema26;
            tmp.push({ val: data[i].ema26 - data[i].ema12 });
        }

        if (i === 33) {
            newData[i].macd1226 = avg(tmp, 'val');
            prevIndex.macd1226 = data[i].macd1226;
        }
        idx += 1;
    });

    return { startIdex: idx, prevIndex };
}


function genInitVal(techDataMap, symbolId) {
    var prevIndex = {};
    if (symbolId in techDataMap) {
        prevIndex.ema12 = Number(techDataMap[symbolId].EMA12);
        prevIndex.ema26 = Number(techDataMap[symbolId].EMA26);
        prevIndex.macd1226 = Number(techDataMap[symbolId].macd1226);
    }
    return prevIndex;
}

function calcIndex(prevMACD, data) {
    var tmpdata = data[1];
    var close = ((tmpdata.close * 2) + tmpdata.high + tmpdata.low) / 4;

    var ema12 = calcEma(close, prevMACD.ema12, 12);
    var ema26 = calcEma(close, prevMACD.ema26, 26);
    var dif = ema12 - ema26;
    var macd1226 = calcEma(dif, prevMACD.macd1226, 9);

    return {
        ema12,
        ema26,
        macd1226
    };
}

module.exports = {
    dayBefore,
    setFirstValueTodata,
    setValueTodata,
    genInitVal,
    calcIndex
};
