var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var start = function(){
    var file = 'C:/Users/USER/Desktop/Fugle/tw_stock_log.json'; 
    fs.readFileAsync(file).then(function(information){
        var string = information.toString();
        var pre_index = 0;
        var arr = [];
        var count = {
            _402 : 0,
            _401 : 0,
            _400 : 0,
            _399 : 0,
            _398 : 0,
            _397 : 0,
            _396 : 0,
            _395 : 0,
            _394 : 0,
            _393 : 0,
            _392 : 0,
            _391 : 0,
            _390 : 0,
            _389 : 0,
            _388 : 0,
            _387 : 0,
            _386 : 0,
            _385 : 0
        };
        for (var i = 0; i < string.length; i++) {
            var index = string.indexOf("\n",i);
            var txt = string.slice(pre_index,index);
            pre_index = index;
            if(txt==="") continue;
            arr.push(Number(txt));
        }
        // console.log(arr);
        // console.log(arr.length);
        arr.forEach(function(element){
            if(3.85 <= element && element < 3.86) count._385 ++;
            if(3.86 <= element && element < 3.87) count._386 ++;
            if(3.87 <= element && element < 3.88) count._387 ++;
            if(3.88 <= element && element < 3.89) count._388 ++;
            if(3.89 <= element && element < 3.90) count._389 ++;
            if(3.90 <= element && element < 3.91) count._390 ++;
            if(3.91 <= element && element < 3.92) count._391 ++;
            if(3.92 <= element && element < 3.93) count._392 ++;
            if(3.93 <= element && element < 3.94) count._393 ++;
            if(3.94 <= element && element < 3.95) count._394 ++;
            if(3.95 <= element && element < 3.96) count._395 ++;
            if(3.96 <= element && element < 3.97) count._396 ++;
            if(3.97 <= element && element < 3.98) count._397 ++;
            if(3.98 <= element && element < 3.99) count._398 ++;
            if(3.99 <= element && element < 4.00) count._399 ++;
            if(4.00 <= element && element < 4.01) count._400 ++;
            if(4.01 <= element && element < 4.02) count._401 ++;
            if(4.02 <= element && element < 4.03) count._402 ++;
            console.log(element);
                        
        })
        console.log(count);
    });
};

start();