/**
 * Created by bistin on 2014/9/12.
 */

// 本資訊自民國93年2月11日起提供

var cheerio = require('cheerio');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var iconv = require('iconv-lite');

var req = require('../lib/request_promise');
var requestAsync = req.requestAsyncForceSkip404;
var DataError = require('../lib/Error');
var config = require('../config');

var connections = require('../config/connections')('fugle', ['technical']);
var Stock = connections.models['tw_stock_price'];

if (require.main === module) {
    crawl(moment().add(-3, 'days')).then(function(data) {
        console.log(data);
    });
}

module.exports.crawl = crawl;

function crawl(momentDate) {
    var TWyear = momentDate.year() - 1911;
    //    var url = 'http://www.twse.com.tw/ch/trading/exchange/MI_INDEX/genpage/Report'+momentDate.format("YYYYMM")+'/A112'+momentDate.format("YYYYMMDD")+'ALLBUT0999_1.php?select2=ALLBUT0999&chk_date='+TWyear+'/'+momentDate.format("MM/DD");
    return requestAsync({
        url: 'http://www.twse.com.tw/ch/trading/exchange/MI_INDEX/MI_INDEX.php',
        method: 'POST',
        formData: {
            download: 'html',
            qdate: TWyear + '/' + momentDate.format("MM/DD"),
            selectType: 'ALLBUT0999'
        },
        encoding: null
    }).then(function(data) {
        return data.toString('utf-8');
    }).then(parseContent);
}

var Fields = ['symbol_id', 'volume', 'turnover', 'amount', 'open', 'high', 'low', 'close', 'sign', 'change'];
function parseContent(body) {
    if (_.isEmpty(body)) { throw new DataError('empty data') }
    var $ = cheerio.load(body);
    var $table = $('table').eq(1);
    if (body.indexOf('查無資料') > 0) {
        if ($('table').length === 0) {
            throw new DataError('no data');
        } else {
            $table = $('table').eq(0);
        }
    }
    var ret = [];
    var dateText = $table.find('thead span').text();
    var dataDate = dateText.match(/\d+/g);
    dataDate = dataDate.slice(-3);
    dataDate[0] = +dataDate[0] + 1911;
    dataDate = moment(dataDate.join(""), "YYYYMMDD").toDate();

    $table.find('tbody tr').each(function(idx, val) {
        var rowInfo = $(val).find('td').filter(function(idx) {
            return idx < 11 && idx != 1;
        }).map(function(inidx, inval) {
            return $(inval).text().replace(/\,/g, '').trim();
        }).toArray();

        var rowObj = _.mapValues(_.object(Fields, rowInfo), function(val, key) {
            return (key === 'volume' || key === 'amount' || key === 'turnover') ? (isNaN(+val) ? 0 : +val) : val;
        });

        // set change
        if (rowObj.sign === '－') {
            rowObj.change = '-' + rowObj.change;
        }

        rowObj.date = dataDate;
        ret.push({ symbol_id: rowObj.symbol_id, row: _.omit(rowObj, ['symbol_id', 'sign']) });
    });

    // validate OHLC
    return Promise.map(ret, function(data) {
        var row = data.row;
        return Stock.getClosetPrevDay(data.symbol_id, row.date).then(function(result) {

            row.change_rate = 0;
            if (isNaN(+row.open) && isNaN(+row.high) && isNaN(+row.low) && isNaN(+row.close)) {
                // fake data, set all to `CLOSE` of the latest day having data
                if (!isNaN(Number(result.close))) {
                    row.open = row.high = row.low = row.close = result.close;
                    row.change = row.change_rate = 0;
                } else {
                    // new otc stock first day
                    row.open = row.high = row.low = row.close = null;
                    row.change = row.change_rate = null;
                }
                // 若有交易量, 設為零股交易
                if (row.volume > 0) {
                    row.oddlots = true;
                }
            } else {
                // calculate change_rate
                if (!isNaN(Number(result.close))) {
                    row.change_rate = ((Number(row.change) / Number(result.close)) * 100).toFixed(2);
                    if (isNaN(row.change_rate)) { row.change_rate = 0; }
                }
            }
            return data;
        });

    }).then(function(finalRet) {
        return finalRet;
    });

}
