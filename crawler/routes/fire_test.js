var express = require('express');
var router = express.Router();
var cp = require('child_process');

router.get('/', function(req, res, next) {
    res.render('fire_test');
});

router.post('/ajax', function (req, res){
   console.log('req received');
   var command = 'node ./ptt-crawler_promise.js ' + req.body.board_name + ' page 1';
   console.log(command);
   cp.exec(command, function(err, stdout, stderr){
       if(err) throw err;
       console.log(stdout);
   });
   res.sendStatus(200);
   //res.send(200);
   ////res.end();
});

module.exports = router;
