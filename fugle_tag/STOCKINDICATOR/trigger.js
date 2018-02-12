var _ = require('lodash');
var Promise = require('bluebird');
var Queue = require('bull');

// var config = require('../config');
var queue = Queue('gentag', 6379, '127.0.0.1');

function closeQueue() {
    // do not wait jobs (we do not handle jobs here)
    queue.close(true);
}

function addToQueue(updateObj) {
    // var record = {
    //     Data: JSON.stringify(updateObj),
    //     PartitionKey: updateObj.data.symbol_id || 'pkey',
    //     StreamName: updateObj.streamName
    // };
    return Promise.resolve(
        queue.add(updateObj, {
            attempts: 5
        })
    ).catch(function(error) {
        console.log(error);
    });
}

module.exports = {
    closeQueue: closeQueue,
    addToQueue: addToQueue
};
