var moment = require('moment');
var limitJudge = require('./judge').limitJudge;

// console.log(limitJudge(167.5, '2016-12-5', 'Stock', -0.05));

function commission(cost) {
    var interestRate = 0.001425;
    var interest = 0;
    if (cost * interestRate <= 20 && cost > 0) {
        interest = 20;
    } else {
        interest = Math.round(cost * interestRate);
    }
    return interest;
}

function buyStock(day, preDay, amount, limit, condition, intradayPrice) {
    // condition是為了判斷是不是盤中交易
    var goal = 0;
    var obj = {};
    if (limit === 'LU') {  // 如果委託價格是漲停價
        goal = limitJudge(preDay.close, moment(preDay.date).format('YYYY-MM-DD'), 'Stock', 'LU');
    } else if (limit === 'LD') {  // 如果委託價格是跌停價
        goal = limitJudge(preDay.close, moment(preDay.date).format('YYYY-MM-DD'), 'Stock', 'LD');
    } else {
        goal = limitJudge(preDay.close, moment(preDay.date).format('YYYY-MM-DD'), 'Stock', limit);
    }
    obj.date = moment(day.date).format('YYYY-MM-DD');
    obj.preClose = preDay.close;
    obj.goal = goal;
    obj.amount = amount;
    if (condition === 'intraday') {
        // 買進規則
        if (obj.goal >= intradayPrice) {
            obj.costPrice = intradayPrice;
            obj.cost = Math.round(intradayPrice * amount);
        } else if (obj.goal < intradayPrice && obj.goal >= day.low) {
            obj.costPrice = obj.goal;
            obj.cost = Math.round(obj.goal * amount);
        } else {  // 買不到
            obj.costPrice = 0;
            obj.cost = 0;
        }
    } else {
        // 買進規則
        if (obj.goal >= day.open) {
            obj.costPrice = day.open;
            obj.cost = Math.round(day.open * amount);
        } else if (obj.goal < day.open && obj.goal >= day.low) {
            obj.costPrice = obj.goal;
            obj.cost = Math.round(obj.goal * amount);
        } else {  // 買不到
            obj.costPrice = 0;
            obj.cost = 0;
        }
    }
    obj.cost += commission(obj.cost);
    // console.log(obj.date);
    // console.log("count : "+count);
    return obj;

    //盤中
    //Input stock price everyday
    //set contract
    //if today is the buyDay & still intrade
    //





}

function getCost(data, range, period, buyDay, amount, limit) {
    var bag = [];
    var preIndex = data.length - 1;
    var currentMonth = new Date(data[data.length - 1].date).getMonth();
    var currentDate = new Date(data[data.length - 1].date).getDate();
    var startDate = moment().add(-1 * (range), 'M').toDate();
    var n;
    var sth;
    var success = [];
    var bagObj = {};
    var preDate;
    var tmp;
    if (currentDate > buyDay) currentMonth -= (period - 1);

    for (n = data.length - 1; n >= 1; n -= 1) { // n=0的收盤價是最舊的交易日的0%委託價
        // 找目標日期以後的最近交易日
        preDate = new Date(data[preIndex].date);
        tmp = new Date(data[n].date);
        // 找到買進日
        if (tmp.getDate() === buyDay && currentMonth === tmp.getMonth()) { // 日期和要求的一樣
            if (tmp === startDate) { // 若是盤中才交易
                sth = buyStock(data[n], data[n - 1], amount, limit, 'intraday', 130);
                // sth = buyStock(data[n], data[n - 1], amount, limit, undefined, undefined);
            } else {
                sth = buyStock(data[n], data[n - 1], amount, limit, undefined, undefined);
                // console.log('sth : '+ sth);
            }
            bag.push(sth);
            currentMonth -= (1 * period);
        } else if (tmp.getDate() < buyDay && currentMonth === tmp.getMonth()) { // 日期比要求的小
            if (preIndex !== data.length - 1) {
                sth = buyStock(data[preIndex], data[preIndex - 1], amount, limit, undefined, undefined);
                bag.push(sth);
            }
            currentMonth -= (1 * period);
        } else if ((preDate.getDate() > buyDay && currentMonth === tmp.getMonth() + 1) ||
                    (preDate.getDate() > buyDay && currentMonth === tmp.getMonth() - 11)) {
            if (preIndex !== data.length - 1) {
                sth = buyStock(data[preIndex], data[preIndex - 1], amount, limit, undefined, undefined);
                bag.push(sth);
            }
            currentMonth -= (1 * period);
        }
        if (currentMonth < 0) currentMonth += 12;
        if (bag.length === range / period) break;
        preIndex = n;
    }
    success = bag.filter(element => element.costPrice !== 0);

    bagObj.bag = bag;
    bagObj.success = success.length;

    return bagObj;
}

function returnRate(costArr, value, num, success, limit) {
    // 總成本 = 買入價錢 + 手續費
    // 總價值 = 賣出價格 - 手續費 - 交易稅
    // 報酬率 = (總價值/總成本) - 1
    var cost = 0;
    var rr = 0;
    var rrObj = {};
    var netValue = value - (commission(value) + (value * 0.003));
    costArr.forEach((p) => { // 計算總成本
        cost += p.cost;
    });
    if (cost !== 0) {
        rr = ((netValue / cost) - 1); // 計算投報率
    } else {
        rr = 0;
    }
    rrObj.stock = num;
    rrObj.limit = limit;
    rrObj.cost = cost;
    rrObj.netValue = Math.round(netValue);
    rrObj.return_rate = Math.round(rr * 10000) / 10000;
    rrObj.success = success;
    // console.log("stock : "+num);
    // console.log("cost : "+ cost);
    // console.log("netValue : "+ netValue);
    // console.log("return rate : "+Math.round(rr*100)+"%");
    return rrObj;
}


module.exports = {
    getCost: getCost,
    returnRate: returnRate,
};
