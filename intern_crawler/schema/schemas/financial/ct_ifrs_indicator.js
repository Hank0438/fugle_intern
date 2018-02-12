var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var AccountRow = new Schema({
    code:  { type: String },
    value: { type: Number }
},{
    _id: false
});

var IfrsIndicatorSchema = new Schema({
    ct_code:   { type: String },
    symbol_id: { type: String },
    year:      { type: Number },
    quarter:   { type: Number },
    accu:      { type: Boolean }, // true: 累計, false: 單季
    type:      { type: Number },  // 0:個別, 1:個體, 2:合併
    data:      [ AccountRow ],
},  {
    collection : 'ct_ifrs_indicator',
});

IfrsIndicatorSchema.plugin(updatedPlugin);
IfrsIndicatorSchema.index({ct_code: 1, year: -1, quarter: -1, accu: 1, type: -1}, {unique: true});
IfrsIndicatorSchema.index({symbol_id: 1, year: -1, quarter: -1, accu: 1, type: -1});
IfrsIndicatorSchema.index({'data.code': 1});

IfrsIndicatorSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}).exec();
    },

    getBookValue1s : function(symbolId) {
        return Promise.resolve(
            this.find({
                symbol_id: symbolId, 
                type: {$in: [0, 2]}, 
                accu: true,
                'data.code': 'MKT012',
            }, {
                _id: 0,
                year: 1, 
                quarter: 1,
                'data.$': 1
            }).sort({year: -1, quarter: -1}).limit(1).lean().exec()
        ).then(function(results) {
            if (results.length) {
                return {
                    year: results[0].year,
                    quarter: results[0].quarter,
                    bv: results[0].data[0].value, 
                };
            }else{
                return {};
            }
        });
    },

    getBookValue5y : function(symbolId) {
        return Promise.resolve(this.find({
            symbol_id: symbolId, 
            year: {$gte:(moment().year()-5)}, 
            type: {$in: [0, 2]}, 
            accu: true,
            'data.code': 'MKT012',
        }, {
            symbol_id: 1, 
            year: 1, 
            quarter: 1,
            'data.$': 1
        }).sort({year: -1, quarter: -1}).lean().exec()).map(function(result) {
            return {
                symbol_id: result.symbol_id,
                year: result.year,
                quarter: result.quarter,
                value: result.data[0].value
            };
        });
    },

    getByCode5y : function(symbolId, code, accu) {
        return Promise.resolve(this.find({
            symbol_id: symbolId, 
            year: {$gte:(moment().year()-5)}, 
            type: {$in: [0, 2]}, 
            accu: accu,
            'data.code': code,
        }, {
            symbol_id: 1, 
            year: 1, 
            quarter: 1,
            'data.$': 1
        }).sort({year: -1, quarter: -1, type: -1}).lean().exec()).map(function(result) {
            return {
                symbol_id: result.symbol_id,
                year: result.year,
                quarter: result.quarter,
                value: result.data[0].value
            };
        }).then(function(tempResults) {
            // only leave one type for same y/q (prefer to use type 2, then type 1, type 0)
            var results = [];
            tempResults.forEach(function(tempResult, idx) {
                if (idx === 0 || (tempResults[idx].year !== tempResults[idx-1].year || tempResults[idx].quarter !== tempResults[idx-1].quarter)) {
                    results.push(tempResults[idx]);
                }
            });
            return results;
        });
    },

    getRoe5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'YLD015', false);
    },

    getRoa5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'YLD016', false);
    },

    // year data to seasonal based
    getRecvTurnoverRatio5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'SRF008', false).map(function(result) {
            result.value /= 4;
            return result;
        });
    },

    // year data to seasonal based
    getDaysSalesOutstanding5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'SRF009', false).map(function(result) {
            result.value /= 4;
            return result;
        });
    },

    // year data to seasonal based
    getInventoryTurnover5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'SRF010', false).map(function(result) {
            result.value /= 4;
            return result;
        });
    },

    // year data to seasonal based
    getDaysSalesInventory5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'SRF011', false).map(function(result) {
            result.value /= 4;
            return result;
        });
    },

    getPropertyTurnover5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'ACT004', false);
    },

    getTotalAssetsTurnover5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'ACT009', false);
    },

    getCurrentRatio5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'SRF003', true);
    },

    getQuickRatio5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'SRF005', true);
    },

    getInterestProtection5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'LRF012', true);
    },

    bulkUpdateData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var symbolIds = [];
        return Promise.map(rows, function(row) {
            return self.updateData(row, fromDbId, fromColId, fromColSchema).then(function(updated) {
                if (updated) { symbolIds.push(row.LIST_CODE); }
            });
        }, {concurrency: MAX_CONCURRENT_WRITES}).then(function() {
            return _.uniq(symbolIds);
        });
    },

    bulkRemoveData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var symbolIds = [];
        return Promise.map(rows, function(row) {
            return self.removeData(row, fromDbId, fromColId, fromColSchema).then(function(updated) {
                if (updated) { symbolIds.push(row.LIST_CODE); }
            });
        }, {concurrency: MAX_CONCURRENT_WRITES}).then(function() {
            return _.uniq(symbolIds);
        });
    },

    updateOneRow : function(data, accu, type, option) {
        return this.update({
            'ct_code':   data.ct_code,
            'year':      Number(data.yq.substr(0, 4)),
            'quarter':   Number(data.yq.substr(4)),
            'accu':      accu,
            'type':      type,
        }, {
            $set: {
                'symbol_id':  data.list_code,
                'updated_at': new Date()
            },
            $addToSet: {
                data: { 
                    code: data.rat_code, 
                    value: data.data_value,
                }
            }
        }, { upsert: true }).exec().then(function() {
            return true;
        });
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var type, accu;
        if (fromColId === 'FINROA') {
            type = 0; accu = false;
        }else if (fromColId === 'FINROC') {
            type = 2; accu = false;
        }else if (fromColId === 'FINRQA') {
            type = 0; accu = true;
        }else if (fromColId === 'FINRQC') {
            type = 2; accu = true;
        }else{
            throw new Error('wrong colId: ' + fromColId);
        }
        var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
            data = dataUtils.lowerCaseKeys(data);

        var match = {
            'ct_code':   data.ct_code,
            'year':      Number(data.yq.substr(0, 4)),
            'quarter':   Number(data.yq.substr(4)),
            'accu':      accu,
            'type':      type,
            'data.code': data.rat_code,
        };
        return this.update(match, {
            $set: {
                'symbol_id':    data.list_code,
                'data.$.value': data.data_value, 
            }
        }).exec().then(function(response) {
            if (response.n > 0) { 
                if (response.nModified !== 0 || response.upserted) {
                    return self.update(match, {
                        $set: { updated_at: new Date() }
                    }).exec().then(function() {
                        return true;
                    });
                } else {
                    return false;
                }
            } else {
                return self.updateOneRow(data, accu, type);
            }
        }).catch(function(error) {
            if (error.code === 11000) {
                // duplicated due to map execution
                return self.updateOneRow(data, accu, type);
            } else {
                throw new Error(error);
            }
        });
    },

    removeData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var type, accu;
        if (fromColId === 'FINROA') {
            type = 0; accu = false;
        }else if (fromColId === 'FINROC') {
            type = 2; accu = false;
        }else if (fromColId === 'FINRQA') {
            type = 0; accu = true;
        }else if (fromColId === 'FINRQC') {
            type = 2; accu = true;
        }else{
            throw new Error('wrong colId: ' + fromColId);
        }
        var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
            data = dataUtils.lowerCaseKeys(data);

        var match = {
            ct_code:   data.ct_code,
            year:      Number(data.yq.substr(0, 4)),
            quarter:   Number(data.yq.substr(4)),
            accu:      accu,
            type:      type
        };
        return this.findOneAndUpdate(match, {
            $pull: {
                data: { 
                    code: data.acc_code,
                    value: data.data_value
                }
            }
        }).exec().then(function(response) {
            if (response) {
                var dataInOldDoc = response.data.findIndex(function(x) { return x.code === data.acc_code; }) !== -1;
                if (response.data.length === 1 && dataInOldDoc) {
                    // remove whole document
                    return self.findOneAndRemove(match).exec().then(function() {
                        return true;
                    });
                } else if (dataInOldDoc) {
                    return self.update(match, {
                        $set: { updated_at: new Date() }
                    }).exec().then(function() {
                        return true;
                    });                    
                } else {
                    return false;
                }
            } else {
                return false;
            }
        });
    }
};

module.exports = IfrsIndicatorSchema;
