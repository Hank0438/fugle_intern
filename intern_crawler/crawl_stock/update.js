var moment = require('moment');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var nodeUuid = require('node-uuid');

var CRAWLER_NAME = 'stock_price';
var tseCrawler = require('./crawl_stock');
var otcCrawler = require('./crawl_otc');
var emgCrawler = require('./crawl_em');
var config = require('../config');
var logger = require('../lib/logger');
var pubTrigger = require('../lib/pub_trigger');
var kinesisTrigger = require('../kinesis/trigger');
var runCrawler = require('../lib/run_crawler');
var connections = require('../config/connections')('fugle', ['technical']);
var Stock = connections.models['tw_stock_price'];
var contentSpecIds = ['FCNT000002', 'FCNT000013', 'FCNT000039'];
var logMeta = {
    crawler: CRAWLER_NAME,
    fingerprint: nodeUuid.v4()
};

function crawlerWork(momentDate) {
    var logSymbolIds = { 'crawled': [], 'updated': [] };
    return [
        [tseCrawler, momentDate, 'tse', logSymbolIds],
        [otcCrawler, momentDate, 'otc', logSymbolIds],
        [emgCrawler, momentDate, 'emg', logSymbolIds],
    ].reduce(function(sequence, step) {
        return sequence.then(function() {
            return getStockTicks.apply(null, step);
        });
    }, Promise.resolve()).then(function() {
        return contentSpecIds;
    }).each(function(contentSpecId) {
        if (logSymbolIds['updated'].length) {
            return pubTrigger.trigger({
                symbolIds: logSymbolIds['updated'],
                contentSpecId: contentSpecId
            });
        }
    }).then(function() {
        return pubTrigger.triggerCheckTime(contentSpecIds);
    }).then(function() {
        return logSymbolIds;
    }).catch(function(err) {
        logger.error(err, logMeta);
    });
}

function getStockTicks(crawler, momentDate, type, logSymbolIds) {
    logger.info(`Stock Update: ${type} start ${momentDate.format('YYYYMMDD')}`, logMeta);
    return crawler.crawl(momentDate).map(function(data) {
        return Promise.resolve(
            Stock.updateData(data.symbol_id, data.row)
        ).then(function(updated) {
            logSymbolIds['crawled'].push(data.symbol_id);
            if (updated) {
                logSymbolIds['updated'].push(data.symbol_id);
                return kinesisTrigger.addToQueue({
                    data: Object.assign(data.row, {symbol_id: data.symbol_id}),
                    streamName: `${config.aws.kinesisPrefix}technical.tw_stock_price`
                });
            }
        }).catch(function(err) {
            logger.error(err, logMeta);
        })
    }, { concurrency: 20 }).then(function() {
        logger.info(`Stock Update: ${type} done`, logMeta);
    }).catch(function(err) {
        if (err.message === 'no data') {
            logger.warn(`Stock Update empty: ${type}`, logMeta);
        } else {
            logger.error(`Stock Update error: ${type} ${err}`, logMeta);
        }
    })
};

// default to crawl 3 days data
// * if no specified date: crawl from today-2 ~ today
// * if start date is specified: crawl only that date
// * if start/end are specified: crawl from start ~ end
var today = moment().format('YYYYMMDD');
var dateStart = (process.argv.length > 2) ? moment(process.argv[2], 'YYYYMMDD') : moment(today, 'YYYYMMDD').add(-2, 'days');
var dateEnd = (process.argv.length > 3) ? moment(process.argv[3], 'YYYYMMDD') : ((process.argv.length > 2) ? dateStart.clone() : moment(today, 'YYYYMMDD'));
runCrawler(CRAWLER_NAME, logMeta, dateStart, dateEnd, 1, 'days', crawlerWork).delay(5000).finally(function() {
    logger.close();
    kinesisTrigger.closeQueue();
    mongoose.disconnect();
});
