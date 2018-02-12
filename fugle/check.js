var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

fs.readFileAsync('C:/Users/USER/Desktop/Fugle/all_period_buyday_1.json').then(function(stock){
    var arr = JSON.parse(stock.toString());
    fs.readFileAsync('C:/Users/USER/Desktop/Fugle/all.json').then(function(s1){
        var s1Arr = JSON.parse(s1.toString());
        s1Arr.forEach(function(ans){
            // console.log(ans);
            var check = ans.symbol_id;
            var stat = 0;
            arr.forEach(function(single){
                // console.log(single.stock);
                if(check === single.stock){
                    stat = 1;
                }
            });
            if(stat === 0){
                console.log(check);
            }
        });
    });
});