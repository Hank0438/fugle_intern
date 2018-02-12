// ptt_crawler.start(board_name, [page/day], [limit_number])
var ptt_crawler = require('./ptt-crawler_promise'),
    mongoose = require('mongoose'),
    Promise = require('bluebird'),
    database = require('./model/PTT'),
    cp = require('child_process');

//    crawler = require('./model/mgr');
//這邊不知該如何連

var crawler_model = database.crawler;
var crawlers = [];

return crawler_model.find({}).exec().then(function(crawlers){
    console.log('INNNNNNNNNN');
    return Promise.each(crawlers, function(crawler){
        console.log('crawler ' +
                    crawler.board_name + '_' +
                    crawler.setting.limit_type + '_' +
                    crawler.setting.limit_number + ': '+
                    crawler.status
        );
        if (crawler.status == 'Alive'){
            /*
            return new_clawler = ptt_crawler.start(
                crawler.board_name,
                crawler.setting.limit_type,
                crawler.setting.limit_number,
                function(settingstring){
                    console.log('crawler: ' + settingstring + ' finished');
                });
            */
            var command = 'node ./ptt-crawler_promise.js ' +
                            crawler.board_name + ' ' +
                            crawler.setting.limit_type + ' ' +
                            crawler.setting.limit_number + 'force';
            console.log(command);
            cp.exec(command, function(err, stdout, stderr){
                if(err) {
                    console.log('stderr: ', stderr);
                    throw err;
                }
                console.log('stdout: ', stdout);
            });
            return;
        }
        else return;
    }).then(function(){
        console.log('DONE!');
        mongoose.disconnect();
    });
});


/*
return crawler.find({}).exec().then(function (err, crawlers){
    if (err) return console.error(err);
    for (var i = 0; i < crawlers.length; i++){
        console.log('crawler ' +
                    crawlers[i].board_name + '_' +
                    crawlers[i].setting.limit_type + '_' +
                    crawlers[i].setting.limit_number + ': '+
                    crawlers[i].status
        );
        if (crawlers[i].status == 'Alive'){
            var new_clawler = ptt_crawler.start(
                crawlers[i].board_name,
                crawlers[i].setting.limit_type,
                crawlers[i].setting.limit_number,
                function(settingstring){
                    console.log('crawler: ' + settingstring + ' finished');
                });
        }
    }
    return;
}).then(function(){
    console.log('DONE');
    //mongoose.disconnect();
});
*/
//return;
//var stock_crawler = ptt_crawler.start('Stock', 'page', 2, function(){});
