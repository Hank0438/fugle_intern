var express  = require('express');
var mongoose = require( 'mongoose' );
var router   = express.Router();
var database = require('../model/PTT');
var cp = require('child_process');
var request_promise = require('request-promise');
var moment = require('moment');
var Promise = require('bluebird');
var mgrCrawler = database.crawler;
var logTable = database.logTable;


router.get('/', function(req, res, next) {
    var crawlers = [];
    //console.log('get / now');
    /*
    Promise.resolve(mgrCrawler.find({}).exec()).then(function(crawlers){
        console.log('get it!!!!');

        res.render('index', {
            mgr : crawlers,
            title : 'Crawlers'
        });
        return;
    }).then(function(){
        console.log('DONE');
        return;
    }).catch(function(){
        console.log('err here');
        return;
    });
    */

    mgrCrawler.find({}).exec().then(function(crawlers){
        //console.log(crawlers);
        res.render('index', {
            mgr : crawlers,
            title : 'Crawlers'
        });
        return;
    }).then(function(){
        console.log('DONE');
        return;
    }).catch(function(){
        console.log('err here');
        return;
    });
    //res.sendStatus(200);
});

// restart a crawler
router.post('/ajax', function (req, res){

   var command = 'node ./ptt-crawler_promise.js' + req.body.cmd_string;
   console.log(command);

   cp.exec(command, function(err, stdout, stderr){
       if(err) {
           console.log('stderr: ', stderr);
           throw err;
       }
       console.log('stdout: ', stdout);

   });

   res.sendStatus(200);

});


router.post('/add_new_crawler', function (req, res){

   var board_name = req.body.board_name;
   var limit_type = req.body.limit_type;
   var limit_number = parseInt(req.body.limit_number);

   if (limit_type != 'page' && limit_type != 'day'){
       res.status(200).json({msg : 'ERROR: limit_type should be "page" '+ 'or'+ '" day"', code : 1});
   }
   else if(!limit_number || limit_number <= 0 || limit_number > 10){
       res.status(200).json({msg : 'ERROR: limit_number should be an integer, larger than 0 and smaller than 10', code : 1});
   }
   else{
       var url = 'https://www.ptt.cc/bbs/' + board_name + '/index.html';
       request_promise(url).then(function(body){
           return mgrCrawler.findOne({
               'board_name' : board_name,
               'setting.limit_type' : limit_type,
               'setting.limit_number' : limit_number
           }).exec().then(function(result){
               if(!result){
                   var current_time = moment().format('YYYY-MM-DD HH:mm:ss');
                   var new_crawler = {
                       board_name : board_name,
                       setting : { limit_type : limit_type, limit_number : limit_number },
                       create_time : current_time,
                       last_updatetime : current_time,
                       last_update : 'Create',
                       current : 'Sleep',
                       status : 'Alive'
                   };
                   mgrCrawler.create(new_crawler).then(function(){
                       var log = {
                           board_name : board_name,
                           setting : {limit_type : limit_type, limit_number : limit_number},
                           last_update : 'Create',
                           last_updatetime : current_time,
                           info : 'Create a new crawler: '+board_name+'_'+limit_type+'_'+limit_number
                       };
                       return logTable.create(log).then(function(response){
                           console.log('Create a new crawler logged');
                       }).catch(function(err){
                           console.log('write logTable error');
                       });
                   });

                   res.status(200).json({msg : 'Crawler '+board_name+'_'+limit_type+'_'+limit_number + ' is added successfully', code : 0});
               }
               else{
                   res.status(200).json({msg : 'ERROR: Crawler '+board_name+'_'+limit_type+'_'+limit_number+' already exists', code : 1});
               }
               return;
           });
       }).catch(function(err){
           res.status(200).json({msg : 'ERROR: unknown board_name: '+board_name, code : 1});
       });
   }
});

router.post('/delete_crawler', function (req, res){

    var board_name = (req.body.board_name).trim();
    var limit_type = (req.body.limit_type).trim();
    var limit_number = parseInt(req.body.limit_number);
    var cmd_string = board_name+'_'+limit_type+'_'+limit_number;
    var current_time = moment().format('YYYY-MM-DD HH:mm:ss');

    //console.log(cmd_string);
    mgrCrawler.remove({
        'board_name' : board_name,
        'setting.limit_type' : limit_type,
        'setting.limit_number' : limit_number
    }).exec().then(function(){

        var log = {
            board_name : board_name,
            setting : {limit_type : limit_type, limit_number : limit_number},
            last_update : 'Delete',
            last_updatetime : current_time,
            info : 'Delete a crawler: '+board_name+'_'+limit_type+'_'+limit_number
        };
        res.status(200).json({msg : 'Remove crawler '+cmd_string+' completed.', code : 0});

        return logTable.create(log).then(function(response){
            console.log('Delete a new crawler logged');
        }).catch(function(err){
            console.log('write logTable error');
        });
    }).catch(function(err){
        res.status(200).json({msg : 'ERROR: Cannot remove crawler '+cmd_string, code : 1});
    });
});


router.post('/update_crawler', function (req, res){

    var board_name = (req.body.board_name).trim();
    var limit_type = (req.body.limit_type).trim();
    var limit_number = parseInt(req.body.limit_number);
    var old_limit_type, old_limit_number, old_cmd_string, update;
    var current_time = moment().format('YYYY-MM-DD HH:mm:ss');

    if (req.body.old_limit_type){
        old_limit_type = (req.body.old_limit_type).trim();
        old_cmd_string = board_name+'_'+old_limit_type+'_'+limit_number;
        update = 'type';
    }
    else if(req.body.old_limit_number){
        old_limit_number = parseInt(req.body.old_limit_number);
        old_cmd_string = board_name+'_'+limit_type+'_'+old_limit_number;
        update = 'number';
    }


    var new_cmd_string = board_name+'_'+limit_type+'_'+limit_number;

    console.log(old_cmd_string + ' ----> '+ new_cmd_string);



    mgrCrawler.findOne({
        'board_name' : board_name,
        'setting.limit_type' : limit_type,
        'setting.limit_number' : limit_number
    }).exec().then(function(result_1){
        //console.log(result_1);
        if (!result_1){
            if (update == 'type'){
                mgrCrawler.findOne({
                    'board_name' : board_name,
                    'setting.limit_type' : old_limit_type,
                    'setting.limit_number' : limit_number
                }).exec().then(function(result){
                    if (result.current == 'Crawling'){
                        res.status(200).json({msg : 'ERROR: crawler '+old_cmd_string+ ' is crawling now, cannot update.', code : 1});
                        return;
                    }
                    result.setting.limit_type = limit_type;
                    return result.save(function(err){
                        if (err) throw err;
                        res.status(200).json({msg : 'Update crawler ' + old_cmd_string +' to '+new_cmd_string+ ' successfully.', code : 0});
                    }).then(function(){
                        var log = {
                            board_name : board_name,
                            setting : {limit_type : limit_type, limit_number : limit_number},
                            last_update : 'Update (type)',
                            last_updatetime : current_time,
                            info : old_cmd_string + ' ----> '+ new_cmd_string
                        };
                        return logTable.create(log).then(function(response){
                            console.log('Update a crawler logged');
                        }).catch(function(err){
                            console.log('write logTable error');
                        });
                    });
                }).catch(function(err){
                    res.status(200).json({msg : 'ERROR1: Cannot update crawler '+old_cmd_string+ ' to '+ new_cmd_string, code : 1});
                });
            }
            else if(update == 'number'){
                mgrCrawler.findOne({
                    'board_name' : board_name,
                    'setting.limit_type' : limit_type,
                    'setting.limit_number' : old_limit_number
                }).exec().then(function(result){
                    if (result.current == 'Crawling'){
                        res.status(200).json({msg : 'ERROR: crawler '+old_cmd_string+ ' is crawling now, cannot update.', code : 1});
                        return;
                    }
                    result.setting.limit_number = limit_number;
                    return result.save(function(err){
                        if (err) throw err;
                        res.status(200).json({msg : 'Update crawler ' + old_cmd_string +' to '+new_cmd_string+ ' successfully.', code : 0});
                    }).then(function(){
                        var log = {
                            board_name : board_name,
                            setting : {limit_type : limit_type, limit_number : limit_number},
                            last_update : 'Update (number)',
                            last_updatetime : current_time,
                            info : old_cmd_string + ' ----> '+ new_cmd_string
                        };
                        return logTable.create(log).then(function(response){
                            console.log('Update a crawler logged');
                        }).catch(function(err){
                            console.log('write logTable error');
                        });

                    });
                }).catch(function(err){
                    res.status(200).json({msg : 'ERROR1: Cannot update crawler '+old_cmd_string+ ' to '+ new_cmd_string, code : 1});
                });
            }

        }
        else{
            res.status(200).json({msg : 'ERROR: ' +new_cmd_string+ ' already exist.', code : 1});
        }
    }).catch(function(err){
        res.status(200).json({msg : 'ERROR2: Cannot update crawler '+old_cmd_string+ ' to '+ new_cmd_string, code : 1});
    });


});

router.post('/check_crawler', function (req, res){

    var board_name = (req.body.board_name).trim();
    var limit_type = (req.body.limit_type).trim();
    var limit_number = parseInt(req.body.limit_number);
    var index = req.body.index;
    var cmd_string = board_name+'_'+limit_type+'_'+limit_number;
    //console.log(cmd_string);

    mgrCrawler.findOne({
        'board_name' : board_name,
        'setting.limit_type' : limit_type,
        'setting.limit_number' : limit_number
    }).exec().then(function(result){
        if (result.current == 'Sleep'){
            res.status(200).json({msg : 'Sleep', code : 0,
                update_time : result.last_updatetime,
                update : result.last_update,
                index : index
            });
        }
        else{
            res.status(200).json({msg : 'Still Not sleep', code : 1});
        }
    });

    /*
    mgrCrawler.remove({
        'board_name' : board_name,
        'setting.limit_type' : limit_type,
        'setting.limit_number' : limit_number
    }).exec().then(function(){
        res.status(200).json({msg : 'Remove crawler '+cmd_string+' completed.', code : 0});
    }).catch(function(err){
        res.status(200).json({msg : 'ERROR: Cannot remove crawler '+cmd_string, code : 1});
    });
    */
    //res.status(200).json({msg : cmd_string, code : 0});
});


router.post('/change_crawler_current', function (req, res){

    var board_name = (req.body.board_name).trim();
    var limit_type = (req.body.limit_type).trim();
    var limit_number = parseInt(req.body.limit_number);
    var new_type  = req.body.new_type;
    var cmd_string = board_name+'_'+limit_type+'_'+limit_number + '_' +new_type;
    var current_time = moment().format('YYYY-MM-DD HH:mm:ss');
    mgrCrawler.findOne({
        'board_name' : board_name,
        'setting.limit_type' : limit_type,
        'setting.limit_number' : limit_number
    }).exec().then(function(result){
        result.current = new_type;
        return result.save(function(err){
            if (err) throw err;
            res.status(200).json({msg : 'Change crawler current to '+new_type+ ' successfully.', code : 0});
        }).then(function(){
            var log = {
                board_name : board_name,
                setting : {limit_type : limit_type, limit_number : limit_number},
                last_update : 'Update (current)',
                last_updatetime : current_time,
                info : 'Change crawler status to ' + new_type + ' manually'
            };

            return logTable.create(log).then(function(response){
                console.log('Update a crawler logged');
            }).catch(function(err){
                console.log('write logTable error');
            });
        });
    }).catch(function(err){
        res.status(200).json({msg : 'Change crawler current error.', code : 1});
        return;
    });
    //res.status(200).json({msg : 'Good', code : 0});

});



module.exports = router;
