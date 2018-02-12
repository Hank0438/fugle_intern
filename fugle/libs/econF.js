var Promise = require('bluebird');
var moment = require('moment');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));

// var url = 'https://api.fugle.tw/v1/data/content/FCNT000002-Y9999';
var url = 'https://api.fugle.tw/v1/data/content/FCNT000005-Y9999';

request(url).then(function(data){
    var container = JSON.parse(data.toString());
    var day = container.rawContent;
    var startDate = moment('2015-01-01').toDate();
    var endDate = moment('2016-12-31').toDate();
    var daySet = day.filter(d => new Date(d.date) >= startDate && new Date(d.date) <= endDate);
    var output = [];
    daySet.forEach(function(el){
        var obj = {};
        obj.date = moment(el.date).format('YYYY-MM-DD')
        // obj.close = el.close;
        // obj.change = el.change;
        // obj.change_rate = el.change_rate;
        obj.FIbuy = el.FIbuy;
        obj.FIsell = el.FIsell;
        obj.ITbuy = el.ITbuy;
        obj.ITsell = el.ITsell;
        obj.DLbuy = el.DLbuy;
        obj.DLsell = el.DLsell;
        obj.total = el.total;
        output.push(obj);
    });
    fs.writeFileSync('fid.json', JSON.stringify(output, null, 4));
});


