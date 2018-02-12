var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');

var CrawlerStatus = new Schema({
    crawler: { type: String },
    status: { type: String }, // running, sleeping
    running_instances: [{ type: String }],
    last_run: { type: Date }
}, {
    versionKey: false,
    collection: 'crawler_status'
});

CrawlerStatus.index({ crawler: 1 }, { unique: true });
CrawlerStatus.index({ status: 1 });
CrawlerStatus.index({ last_run: -1 });

CrawlerStatus.statics = {

    isSleeping: function(crawler) {
        return Promise.resolve(
            this.findOne({
                crawler: crawler
            }, {
                status: 1
            }).lean().exec()
        ).then(function(obj) {
            return obj ? obj.status === 'sleeping' : true;
        });
    },

    askToRun: function(crawler) {
        // crawlers which should not have multiple instances
        var prohibitMultiple = [
            'chinatimes'
        ];
        if (prohibitMultiple.indexOf(crawler) === -1) {
            return Promise.resolve(true);
        } else {
            return this.isSleeping(crawler);
        }
    },

    terminate: function(crawler, fingerprint) {
        // may need to update status but may also cause conflicts...
        // like: set to sleep after the restarted daemon set status to running
        return Promise.resolve(
            this.update({
                crawler: crawler
            }, {
                $set: {
                    $pull: {
                        running_instances: []
                    }
                }
            }).lean().exec()
        );
    },

    setStatus: function(crawler, uuid, status) {
        var self = this;
        if (status === 'running') {
            return Promise.resolve(
                this.update({
                    crawler: crawler
                }, {
                    $set: {
                        status: status,
                        last_run: new Date()
                    },
                    $addToSet: {
                        running_instances: uuid
                    }
                }, { upsert: true }).lean().exec()
            );
        } else if (status === 'sleeping') {
            return Promise.resolve(
                self.update({
                    crawler: crawler
                }, {
                    $pull: {
                        running_instances: uuid
                    }
                }).lean().exec()
            ).then(function() {
                return self.findOne({
                    crawler: crawler                    
                }, {
                    _id: 0,
                    running_instances: 1
                }).lean().exec();
            }).then(function(obj) {
                if (obj.running_instances.length === 0) {
                    return self.update({
                        crawler: crawler
                    }, {
                        $set: {
                            status: status
                        }
                    }).lean().exec();
                }
            });
        } else {
            console.error(`unknown status: ${status}`);
        }
    },

}

module.exports = CrawlerStatus;
