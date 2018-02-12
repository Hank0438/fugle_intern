function dateJudgeLimit(date) {
    // date judging for 7% or 10%
    var judgeDate = new Date('2015-01-01');
    var dateToday = new Date(Date.parse(date));
    var limitPercent = 0.1;
    if (isNaN(Date.parse(date))) {
        console.log(`WRONG DATE :${date}`);
    }
    if (dateToday < judgeDate) {
        limitPercent = 0.07;
    }
    return limitPercent;
}

function intervalJudge(price, marketType) {
    // market type decide interval
    var interval;
    var level = [0.01, 0.05, 0.1, 0.5, 1, 5];
    if (marketType === 'Stock') {
        // interval judging
        if (price >= 0.01 && price < 10) {
            interval = level[0];
        } else if (price >= 10 && price < 50) {
            interval = level[1];
        } else if (price >= 50 && price < 100) {
            interval = level[2];
        } else if (price >= 100 && price < 500) {
            interval = level[3];
        } else if (price >= 500 && price < 1000) {
            interval = level[4];
        } else if (price >= 1000) {
            interval = level[5];
        }
    } else if (price >= 0.01 && price < 50) {
        interval = level[0];
    } else {
        interval = level[1];
    }
    return interval;
}

function judge(preClose, date, marketType, limit) {
    var limitPercent = dateJudgeLimit(date);
    var interval = intervalJudge(preClose, marketType);
    var limitParam;
    // console.log("INTERVAL : " + interval);

    var goalPrice = preClose;
    if (limit === 'LU') {
        limitParam = limitPercent;
    } else if (limit === 'LD') {
        limitParam = -limitPercent;
    } else {
        limitParam = limit;
    }
    // console.log("limit : " + limitParam);

    while (Math.abs((goalPrice / preClose) - 1) <= Math.abs(limitParam)) {
        goalPrice = Math.round(goalPrice * 10000) / 10000;
        // console.log(goalPrice);
        if (intervalJudge(goalPrice, 'Stock') !== interval) {
            goalPrice += (limitParam > 0) ? intervalJudge(goalPrice, 'Stock') : -intervalJudge(goalPrice, 'Stock');
            // console.log("change interval");
        } else {
            goalPrice += (limitParam > 0) ? interval : -interval;
        }
    }
    // console.log("while:"+goalPrice);
    if (Math.abs((goalPrice / preClose) - 1) > Math.abs(limitParam)) {
        if (intervalJudge(goalPrice, 'Stock') !== interval) {
            goalPrice -= (limitParam > 0) ? intervalJudge(goalPrice, 'Stock') : -intervalJudge(goalPrice, 'Stock');
            // console.log("change interval");
        } else {
            goalPrice -= (limitParam > 0) ? interval : -interval;
        }
    }
    // console.log("final:"+goalPrice);
    goalPrice = Math.round(goalPrice * 10000) / 10000;

    return goalPrice;
}


module.exports = { limitJudge: judge };

if (require.main === module) {
    // judge(167.5, "2016-12-5", "Stock", "LD");
}
