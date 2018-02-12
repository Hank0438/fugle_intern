var Promise = require('bluebird');
var _ = require('lodash');
var moment = require('moment');

module.exports = {
    checkMarket: function(symbolId) {
        var models = require('../../../config/connections')('fugle', ['search']).models;
        var SymbolInfo = models['symbol_info'];
        return Promise.resolve(
            SymbolInfo.findOne({
                symbol_id: symbolId
            }, {
                _id: 0,
                market: 1,
            }).lean().exec()
        );
    },

    checkMarkets: function(symbolIds) {
        var models = require('../../../config/connections')('fugle', ['search']).models;
        var SymbolInfo = models['symbol_info'];
        return Promise.resolve(
            SymbolInfo.find({
                symbol_id: {$in: symbolIds}
            }, {
                _id: 0,
                symbol_id: 1,
                market: 1,
            }).lean().exec()
        );
    },

    get: function(symbolId) {
        var models = require('../../../config/connections')('fugle', ['technical']).models;
        var TwStockPrice = models['tw_stock_price'];
        var UsStockPrice = models['us_stock_price'];
        var ForexPrice = models['forex_price'];
        var CtCommodityPrice = models['ct_commodity_price'];
        return this.checkMarket(symbolId).then(function(symbol) {
            if (!symbol || !symbol.market) {
                return null;
            } else if (symbol.market.match(/^tw\./)) {
                return TwStockPrice.get(symbolId);
            } else if (symbol.market === 'forex' ) {
                return ForexPrice.get(symbolId);
            } else if (symbol.market.match(/(^us\.|^world\.)/)) {
                return UsStockPrice.get(symbolId);
            } else if (symbol.market === 'commodity') {
                return CtCommodityPrice.get(symbolId);
            } else {
                return null;
            }
        });
    },

    getRecent: function(symbolId) {
        var models = require('../../../config/connections')('fugle', ['technical']).models;
        var TwStockPrice = models['tw_stock_price'];
        var UsStockPrice = models['us_stock_price'];
        var ForexPrice = models['forex_price'];
        var CtCommodityPrice = models['ct_commodity_price'];
        return this.checkMarket(symbolId).then(function(symbol) {
            if (!symbol || !symbol.market) {
                return null;
            } else if (symbol.market.match(/^tw\./)) {
                return TwStockPrice.getRecent(symbolId);
            } else if (symbol.market === 'forex' ) {
                return ForexPrice.getRecent(symbolId);
            } else if (symbol.market.match(/(^us\.|^world\.)/)) {
                return UsStockPrice.getRecent(symbolId);
            } else if (symbol.market === 'commodity') {
                return CtCommodityPrice.getRecent(symbolId);
            } else {
                return null;
            }
        });
    },

    getClose5y: function(symbolId) {
        var models = require('../../../config/connections')('fugle', ['technical']).models;
        var TwStockPrice = models['tw_stock_price'];
        var UsStockPrice = models['us_stock_price'];
        var ForexPrice = models['forex_price'];
        var CtCommodityPrice = models['ct_commodity_price'];
        return this.checkMarket(symbolId).then(function(symbol) {
            if (!symbol || !symbol.market) {
                return null;
            } else if (symbol.market.match(/^tw\./)) {
                return TwStockPrice.getClose5y(symbolId);
            } else if (symbol.market === 'forex' ) {
                return ForexPrice.getClose5y(symbolId);
            } else if (symbol.market.match(/(^us\.|^world\.)/)) {
                return UsStockPrice.getClose5y(symbolId);
            } else if (symbol.market === 'commodity') {
                return CtCommodityPrice.getClose5y(symbolId);
            } else {
                return null;
            }
        });
    },

    getLatestBatch: function(symbolIds) {
        var models = require('../../../config/connections')('fugle', ['technical']).models;
        var TwStockPrice = models['tw_stock_price'];
        var UsStockPrice = models['us_stock_price'];
        var ForexPrice = models['forex_price'];
        var CtCommodityPrice = models['ct_commodity_price'];
        return this.checkMarkets(symbolIds).then(function(symbols) {
            var groupedSymbols = _.groupBy(symbols, function(symbol) {
                if (!symbol || !symbol.market) {
                    return null;
                } else if (symbol.market.match(/^tw\./)) {
                    return 'tw';
                } else if (symbol.market === 'forex' ) {
                    return 'forex';
                } else if (symbol.market.match(/(^us\.|^world\.)/)) {
                    return 'us';
                } else if (symbol.market === 'commodity') {
                    return 'commodity'
                } else {
                    return null;
                }
            });
            return Promise.map(Object.keys(groupedSymbols), function(key) {
                var querySymbolIds = groupedSymbols[key].map(function(el) { return el.symbol_id; });
                if (key === 'tw') {
                    return TwStockPrice.getLatestBatch(querySymbolIds);
                } else if (key === 'forex') {
                    return ForexPrice.getLatestBatch(querySymbolIds);
                } else if (key === 'us' || key === 'world') {
                    return UsStockPrice.getLatestBatch(querySymbolIds);
                } else if (key === 'commodity') {
                    return CtCommodityPrice.getLatestBatch(querySymbolIds);
                } else {
                    return [];
                }
            }).then(function(results) {
                var finalResults = [];
                results.forEach(function(ret) {
                    finalResults = finalResults.concat(ret);
                });
                return finalResults;
            });
        });
    },

    getByDatesBatch: function(symbolIds, dates) {
        var models = require('../../../config/connections')('fugle', ['technical']).models;
        var TwStockPrice = models['tw_stock_price'];
        var UsStockPrice = models['us_stock_price'];
        var ForexPrice = models['forex_price'];
        var CtCommodityPrice = models['ct_commodity_price'];
        return this.checkMarkets(symbolIds).then(function(symbols) {
            var groupedSymbols = _.groupBy(symbols, function(symbol) {
                if (!symbol || !symbol.market) {
                    return null;
                } else if (symbol.market.match(/^tw\./)) {
                    return 'tw';
                } else if (symbol.market === 'forex' ) {
                    return 'forex';
                } else if (symbol.market.match(/(^us\.|^world\.)/)) {
                    return 'us';
                } else if (symbol.market === 'commodity') {
                    return 'commodity'
                } else {
                    return null;
                }
            });
            return Promise.map(Object.keys(groupedSymbols), function(key) {
                var querySymbolIds = groupedSymbols[key].map(function(el) { return el.symbol_id; });
                if (key === 'tw') {
                    return TwStockPrice.getByDatesBatch(querySymbolIds, dates);
                } else if (key === 'forex') {
                    return ForexPrice.getByDatesBatch(querySymbolIds, dates);
                } else if (key === 'us' || key === 'world') {
                    return UsStockPrice.getByDatesBatch(querySymbolIds, dates);
                } else if (key === 'commodity') {
                    return CtCommodityPrice.getByDatesBatch(querySymbolIds, dates);
                } else {
                    return [];
                }
            }).then(function(results) {
                var finalResults = [];
                results.forEach(function(ret) {
                    finalResults = finalResults.concat(ret);
                });
                return finalResults;
            });
        });
    },

    getByDates: function(symbolId, dates) {
        var models = require('../../../config/connections')('fugle', ['technical']).models;
        var TwStockPrice = models['tw_stock_price'];
        var UsStockPrice = models['us_stock_price'];
        var ForexPrice = models['forex_price'];
        var CtCommodityPrice = models['ct_commodity_price'];
        if (!dates) {
            dates = [
                moment().startOf('day').toDate(),
                moment().startOf('day').add(-1, 'month').toDate(),
                moment().startOf('day').add(-3, 'months').toDate(),
                moment().startOf('day').add(-12, 'months').toDate(),
            ];            
        }
        return this.checkMarket(symbolId).then(function(symbol) {
            if (!symbol || !symbol.market) {
                return null;
            } else if (symbol.market.match(/^tw\./)) {
                return TwStockPrice.getByDates(symbolId, dates);
            } else if (symbol.market === 'forex' ) {
                return ForexPrice.getByDates(symbolId, dates);
            } else if (symbol.market.match(/(^us\.|^world\.)/)) {
                return UsStockPrice.getByDates(symbolId, dates);
            } else if (symbol.market === 'commodity') {
                return CtCommodityPrice.getByDates(symbolId, dates);
            } else {
                return null;
            }
        });
    },


};
