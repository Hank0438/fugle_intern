var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

request("http://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&_=1435210928008").then(function (data) {
    var twse = data.msgArray;
    // console.log(twse[0].z);
    console.log(data);
});



// {"msgArray":[{"ex":"tse",
//               "d":"20160830",
//               "it":"t",
//               "c":"t00",
//               "n":"發行量加權股價指數",
//               "o":"9113.34",
//               "l":"9093.87",
//               "tk0":"t00.tw_tse_20160830_B_9999339469",
//               "h":"9134.37",
//               "tk1":"t00.tw_tse_20160830_B_9999312906",
//               "i":"tidx.tw",
//               "ip":"0",
//               "v":"68976",
//               "t":"13:33:00",
//               "tv":"4110",
//               "tlong":"1472535180000",
//               "ch":"t00.tw",
//               "z":"9110.56",
//               "y":"9110.17"
//             }],
// "userDelay":5000,
// "rtmessage":"OK",
// "referer":"",
// "queryTime":{"sysTime":"16:01:26",
//              "sessionLatestTime":-1,
//              "sysDate":"20160830",
//              "sessionKey":"tse_t00.tw_20160830|",
//              "sessionFromTime":-1,
//              "stockInfoItem":1024,
//              "showChart":false,
//              "sessionStr":"UserSession",
//              "stockInfo":157199},
//              "rtcode":"0000"
// }
