var _ = require('lodash');

var dayBefore = 5;

function setFirstValueTodata(data, startIdex, value) {
    var returnData = Object.assign({}, data);
    // might have problem
    if (data[startIdex - 1]) {
        returnData[startIdex - 1].k9 = value.k;
        returnData[startIdex - 1].d9 = value.d;
    }
    return { startIdex, prevIndex: value };
}


function setValueTodata(data, value) {
    var returnData = Object.assign({}, data);
    returnData.k9 = value.k;
    returnData.d9 = value.d;
}


function genInitVal(techDataMap, symbolId) {
    var prevIndex = {};
    if (symbolId in techDataMap) {
        prevIndex.d = techDataMap[symbolId].D9;
        prevIndex.k = techDataMap[symbolId].K9;
    } else {
        prevIndex.k = 5000;
        prevIndex.d = 50;
    }
    return prevIndex;
}


function calcIndex(prevKD, data) {
    // data = data.filter(function(row){
    //     return row.volume > 0;
    // });
    var low9days = (_.min(data, 'low')).low;
    var high9days = (_.max(data, 'high')).high;
    var highLowDiff = (high9days - low9days);
    var rsvToday;
    if (highLowDiff === 0) {
        rsvToday = 50;
    } else {
        rsvToday = ((data[data.length - 1].close - low9days) / highLowDiff) * 100;
    }
    const kToday = (prevKD.k * (2 / 3)) + (rsvToday * (1 / 3));
    const dToday = (prevKD.d * (2 / 3)) + (kToday * (1 / 3));

    return {
        k: kToday,
        d: dToday
    };
}

module.exports = {
    dayBefore,
    setFirstValueTodata,
    setValueTodata,
    genInitVal,
    calcIndex
};
