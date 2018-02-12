var moment = require('moment');
var Promise = require('bluebird');
var _ = require('lodash');
var Queue = require('bull');
// var nodeUuid = require('node-uuid');
// var aws = require('aws-sdk');

// var CRAWLER_NAME = 'kinesis-daemon';

var config = require('../../crawler/config');
var connections = require('../../crawler/config/connections')('fugle', ['technical', 'search', 'company']);

var Tag = connections.models['tag'];


var queue = Queue('gentag', 6379, '127.0.0.1');
var jobs = [];
var blukSize = 300;

queue.process(function(job, done) {
    // if (config.aws.enableKenesis) {
    //     pushToKinesis(job.data);
    // }
    queue.clean(5000);
    console.log(job.data.symbol_id, new Date())
    Tag.updateData(job.data).then(function(){
        done();
    });


    /*
    // if we need to do batch push...
    jobs.push(job.data);
    if (jobs.length >= bulkSize) {
        // need to separate jobs by stream name here
        // ...
        pushToKinesis(jobs);
    } else {
        done();
    }
    // also need a setTimeout() to flush uncompleted jobs...
    */
});
