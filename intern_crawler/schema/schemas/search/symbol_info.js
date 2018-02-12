var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

// var dataUtils = require('../../../lib/ct_data_utils');
var config = require('../../../config');
var updatedPlugin = require('../../plugins/updated_new');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

/**
 * 根據 default_score 高低決定卡片推薦優先序,
 * default_score 高過某 threshold 則設定為自動打開卡
 * client 端再設定一些參數決定 max 開卡數量
 */
var cardSchema = new Schema({
    card_spec_id: {type: String},
    default_score: {type: Number},
    updated_at: {type: Date}
},{
    _id: false
});

var SymbolInfo = new Schema({
    symbol_id: {type: String},
    category: {type: String},       // stock, etf, index, stock-group, commodity...
    name: {type: String},
    aliases: [{type: String}],
    market: {type: String},         // see marketCardsMapping below...
    industry: {type: String},
    on_date: {type: Date},
    off_date: {type: Date},
    available_cards: [cardSchema]
}, { collection : 'symbol_info'});

SymbolInfo.plugin(updatedPlugin);
SymbolInfo.index({symbol_id: 1, off_date: -1}, {unique: true});
SymbolInfo.index({market: 1});
SymbolInfo.index({industry: 1});

var availableCards = [
    {card_spec_id: 'FCRD000001', default_score: 100 },  // 'company-detail'
    {card_spec_id: 'FCRD000002', default_score: 100 },  // 'candle-chart'
//    {card_spec_id: 'FCRD000003', default_score: 100 },  // 'margin-table'         // deprecated
//    {card_spec_id: 'FCRD000004', default_score: 100 },  // 'margin-card'          // deprecated
//    {card_spec_id: 'FCRD000005', default_score: 100 },  // 'loan-card'            // deprecated
    {card_spec_id: 'FCRD000006', default_score: 100 },  // 'important-table'
    {card_spec_id: 'FCRD000007', default_score: 100 },  // 'stack-chart'
    {card_spec_id: 'FCRD000008', default_score: 100 },  // month-revenue
//    {card_spec_id: 'FCRD000009', default_score: 100 },  // 'revenue-chart'        // deprecated
//    {card_spec_id: 'FCRD000010', default_score: 100 },  // 'table-statement'      // deprecated
//    {card_spec_id: 'FCRD000011', default_score: 100 },  // 'table-balance'        // deprecated
    {card_spec_id: 'FCRD000012', default_score: 100 },  // 'table-broker-tx'
    {card_spec_id: 'FCRD000013', default_score: 100 },  // 'table-fundamental'
    {card_spec_id: 'FCRD000014', default_score: 100 },  // 'table-concept'           // only for concept
    {card_spec_id: 'FCRD000015', default_score: 100 },  // 'image-card'
    {card_spec_id: 'FCRD000016', default_score: 100 },  // 'chart-bar'
//    {card_spec_id: 'FCRD000017', default_score: 100 },  // 'company-detail-table'
    {card_spec_id: 'FCRD000018', default_score: 100 },  // per-river-chart
    {card_spec_id: 'FCRD000022', default_score: 100 },  // stock-distribution
    {card_spec_id: 'FCRD000023', default_score: 100 },  // stock-dividend
    {card_spec_id: 'FCRD000025', default_score: 100 },  // 損益表
    {card_spec_id: 'FCRD000027', default_score: 100 },  // 現金流量表
    {card_spec_id: 'FCRD000028', default_score: 100 },  // 資產負債表
    {card_spec_id: 'FCRD000029', default_score: 100 },  // stock-transfer
    {card_spec_id: 'FCRD000030', default_score: 100 },  // director-holding
    {card_spec_id: 'FCRD000035', default_score: 100 },  // pbr-river-chart
    {card_spec_id: 'FCRD000037', default_score: 100 },  // commodity-price
    {card_spec_id: 'FCRD000038', default_score: 100 },  // realtime-price
    {card_spec_id: 'FCRD000039', default_score: 100 },  // growth-chart
    {card_spec_id: 'FCRD000040', default_score: 100 },  // news-card
    {card_spec_id: 'FCRD000042', default_score: 100 },  // profit-rate-card
    {card_spec_id: 'FCRD000043', default_score: 100 },  // margin-loan-card
    {card_spec_id: 'FCRD000044', default_score: 100 },  // roe-roa-card
    {card_spec_id: 'FCRD000045', default_score: 100 },  // operating-ability-card
    {card_spec_id: 'FCRD000046', default_score: 100 },  // debt-paying-ability-card
    {card_spec_id: 'FCRD000047', default_score: 100 },  // commodity-group
//    {card_spec_id: 'FCRD000048', default_score: 100 },  // stockfeel-card (enabled by crawler)
];
// 上市櫃
var marketCards = _.filter(availableCards, function(card) { return !_.contains(['FCRD000014', 'FCRD000037', 'FCRD000047'], card.card_spec_id); });
// 興櫃
var emCards = _.filter(availableCards, function(card) { return !_.contains(['FCRD000014', 'FCRD000037', 'FCRD000047'], card.card_spec_id); });
// ETF, 類股指數
var indexCards = _.filter(availableCards, function(card) { return _.contains(['FCRD000002', 'FCRD000038'], card.card_spec_id); });
// 概念股
var conceptCards = _.filter(availableCards, function(card) { return card.card_spec_id === 'FCRD000014'; });
// 創櫃, 公開發行, 未公開發行
var publicCards = _.filter(availableCards, function(card) { return _.contains(['FCRD000001'], card.card_spec_id); });
// Forex
var forexCards = _.filter(availableCards, function(card) { return card.card_spec_id === 'FCRD000002'; });
// U.S. Equity
var usCards = _.filter(availableCards, function(card) { return card.card_spec_id === 'FCRD000002'; });
// World index
var worldIndexCards = _.filter(availableCards, function(card) { return card.card_spec_id === 'FCRD000002'; });
// Commodity
var commodityCards = _.filter(availableCards, function(card) { return card.card_spec_id === 'FCRD000037'; });
// CommodityGroup
var commodityGroupCards = _.filter(availableCards, function(card) { return card.card_spec_id === 'FCRD000047'; });
//
var marketCardsMapping = {
    'tw.tse'           : marketCards,
    'tw.otc'           : marketCards,
    'tw.emg'           : emCards,
    'tw.etf'           : indexCards,
    'tw.index'         : indexCards,
    'tw.concept'       : conceptCards,
    'tw.gisa'          : publicCards,
    'tw.public'        : publicCards,
    'tw.non-public'    : publicCards,
    'forex'            : forexCards,
    'us.nyse'          : usCards,
    'us.nasdaq'        : usCards,
    'us.amex'          : usCards,
    'us.nysearca'      : usCards,
    'world.index'      : worldIndexCards,
    'commodity'        : commodityCards,
    'commodity.group'  : commodityGroupCards,
};

SymbolInfo.statics = {
    get: function(symbol_id) {
        return Promise.resolve(this.findOne({symbol_id: symbol_id}, {_id: 0}).lean().exec());
    },
    getAll: function() {
        return Promise.resolve(this.find({}, {_id: 0}).sort({symbol_id: 1}).lean().exec());
    },

    /*
     * 取得所有曾上市櫃資料
     */
    getAllByMarket: function(market) {
        return Promise.resolve(this.find({market: market}, {_id:0}).sort({symbol_id: 1}).lean().exec());
    },
    getAllByMarkets: function(markets) {
        return Promise.resolve(this.find({market: {$in: markets}}, {_id:0}).sort({symbol_id: 1}).lean().exec());
    },
    /*
     * 目前仍上市櫃
     */
    getValidByMarket : function(market) {
        return Promise.resolve(this.find({market: market, off_date: null}, {_id:0}).sort({symbol_id: 1}).lean().exec());
    },
    getValidByMarkets : function(markets) {
        return Promise.resolve(this.find({market: {$in: markets}, off_date: null}, {_id:0}).sort({symbol_id: 1}).lean().exec());
    },

    bulkUpdateData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        return Promise.map(rows, function(row) {
            return self.updateData(row, fromDbId, fromColId, fromColSchema);
        }, {concurrency: MAX_CONCURRENT_WRITES});
    },

    bulkRemoveData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        return Promise.map(rows, function(row) {
            return self.removeData(row, fromDbId, fromColId, fromColSchema);
        }, {concurrency: MAX_CONCURRENT_WRITES});
    },

    updateAvailableCards: function(_id, availableCards) {
        var self = this;
        var match = {
            _id: _id
        };
        return Promise.resolve(
            this.update(match, {
                $set: {
                    available_cards: availableCards
                }
            }, { upsert: true }).exec()
        ).then(function(response) {
            if (response.nModified !== 0 || response.upserted) {
                return self.update(match, {
                    $set: { updated_at: new Date() }
                }).exec().then(function() {
                    return true;
                });
            } else {
                return false;
            }
        });
    },

    // commodity symbol info is imported from ct's database,
    // check fromDbId to determine where the data comes from.
    // ex: update_company.js crawler will call: SymbolInfo.updateData(finalData, 'tw.stock');
    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        if (fromColId === 'CMDSPC') {
            return this.updateDataCMDSPC(row, fromDbId, fromColId, fromColSchema);
        } else {
            return this.updateDataFUGLE(row);
        }
    },

    updateDataCMDSPC : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var cards = commodityCards;
        var symbolId = 'CM.' + row.CMD_CODE + '.' + row.SPC_CODE;
        var data = {
            symbol_id: symbolId,
            category: 'commodity',
            name: row.NM_SPC60.replace(/ /g, '/').replace(/\/+/g, '/'),
            aliases: [],
            market: 'commodity',
            industry: row.CIP_TYPE,
            on_date: row.START_DATE,
            off_date: (row.END_DATE === '99999999') ? null : row.END_DATE,
            available_cards: cards
        };
        var match = {
            symbol_id: data.symbol_id,
            on_date: data.on_date
        };
        return Promise.resolve(
            this.update(match, data, { upsert: true }).exec()
        ).then(function(response) {
            if (response.nModified !== 0 || response.upserted) {
                return self.update(match, {
                    $set: { updated_at: new Date() }
                }).exec().then(function() {
                    return true;
                });
            } else {
                return false;
            }
        });
    },

    updateDataFUGLE: function(data) {
        var self = this;
        var match = {
            symbol_id: data.symbol_id
        };
        var cards = marketCardsMapping[data.market];
        if (!cards) {
            cards = [];
            console.log('no this type: ' + data.market + ' ' + data.symbol_id);
        }
        return Promise.resolve(
            this.update(match, {
                $set: data,
                $setOnInsert: {
                    available_cards: cards
                }
            }, { upsert: true }).exec()
        ).then(function(response) {
            if (response.nModified !== 0 || response.upserted) {
                return self.update(match, {
                    $set: { updated_at: new Date() }
                }).exec().then(function() {
                    return true;
                });
            } else {
                return false;
            }
        });
    },

    addCard: function(symbolId, cardSpecId) {
        var self = this;
        return Promise.resolve(
            this.findOne({
                symbol_id: symbolId
            }, {
                _id: 0,
                available_cards: 1
            }).lean().exec()
        ).then(function(symbol) {
            var exists = symbol.available_cards.find(function(card) {
                return card.card_spec_id === cardSpecId;
            });
            if (!exists) {
                return self.update({
                    symbol_id: symbolId
                }, {
                    $addToSet: {
                        available_cards: {
                            card_spec_id: cardSpecId,
                            default_score: 100
                        }
                    }
                }).exec();
            }
        });
    },

    updateCards: function(symbolIds, contentSpecId) {
        var self = this;
        var connections = require('../../../config/connections')('fugle', ['search']);
        var CardSpec = connections.models['card_spec'];
        var time = new Date();
        return Promise.resolve(
            CardSpec.find({
                content_spec_ids: contentSpecId
            }, {
                card_spec_id: 1
            }).lean().exec()
        ).then(function(cardSpecs) {
            if (!cardSpecs.length) { return; }
            var bulk = self.collection.initializeOrderedBulkOp();
            symbolIds.forEach(function(symbolId) {
                cardSpecs.forEach(function(spec) {
                    bulk.find({
                        symbol_id: symbolId,
                        off_date: null,
                        'available_cards.card_spec_id': spec.card_spec_id
                    }).updateOne({
                        $set: {
                            'available_cards.$.updated_at': time
                        }
                    });
                });
            });
            return new Promise(function(resolve, reject) {
                bulk.execute(function(err, result) {
                    if (err) {
                        console.log(err)
                    }
                    //console.log(result.toString());
                    resolve();
                });
            });
        });
    },

};

module.exports = SymbolInfo;
