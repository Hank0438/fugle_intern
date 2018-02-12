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

var BalanceSheetSchema = new Schema({
    ct_code:    { type: String },
    symbol_id:  { type: String },
    year:       { type: Number },
    quarter:    { type: Number },
    type:       { type: Number }, // 0:個別, 1:個體, 2:合併
    data:       [ AccountRow ],
},  { 
    collection : 'ct_balance_sheet',
});

BalanceSheetSchema.plugin(updatedPlugin);
BalanceSheetSchema.index({ct_code: 1, year: -1, quarter: -1, type: -1}, {unique: true});
BalanceSheetSchema.index({symbol_id: 1, year: -1, quarter: -1, type: -1});
BalanceSheetSchema.index({'data.code': 1});

BalanceSheetSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}).exec();
    },

    getCapital1s : function(symbolId) {
        return Promise.resolve(
            this.find({
                symbol_id: symbolId, 
                type: {$in: [0, 2]}, 
                'data.code': '3010000',
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
                    capital: results[0].data[0].value, 
                };
            }else{
                return {};
            }
        });
    },

    get2y : function(symbolId) {
        var self = this;
        var models = require('../../aggregate/connections').models;
        var FINFATBSAS = models['FINFATBSAS'];
        var FINFATBSLB = models['FINFATBSLB'];
        var FINFATBSEQ = models['FINFATBSEQ'];
        var year = moment().get('year');
        return Promise.resolve(this
            .find({
                symbol_id: symbolId, 
                type: {$in: [0, 2]},
                year: {$gte: year-2}
            }, {
                _id: 0, 
                ct_code: 0
            })
            .sort({year: -1, quarter: -1, type: -1})
            .limit(8)
            .lean()
            .exec()
        ).then(function(docs) {
            var getMappings1 = Promise.resolve(FINFATBSAS.getAll());
            var getMappings2 = Promise.resolve(FINFATBSLB.getAll());
            var getMappings3 = Promise.resolve(FINFATBSEQ.getAll());
            var getMappings = Promise.join(getMappings1, getMappings2, getMappings3, function(map1, map2, map3) {
                return map1.concat(map2).concat(map3);
            });
            return [docs, getMappings];
        }).spread(function(docs, mappings) {
            if (!docs.length) { return []; }

            // do not show these fields
            var invalidCodes = [
                '3012000', '3012500', '3012600', '3012800', '3014100', '3051100', '3051200', '3053000', 
                '3053500', '3054000', '3054010', '3054020', '3054500', '3055500', '3055505', '3055510', 
                '3055520', '3055530', '3055540', '3055550', '3055560', '3055570', '3055800', '3056700', 
                '3101505', '3103000', '3150000', '3151000', '3151010', '3151020', '3151030', '3151200', 
                '3151210', '3151220', '3151230', '3152530', '3152800', '3152810', '3152820', '3152830', 
                '3152900', '3152910', '3152920', '3152930', '3155000', '3155010', '3155090', '3320000', 
                '3330000',
            ];
            // keep code if have mapping data
            var results = [];
            var validCodes = [];
            docs.forEach(function(doc) {
                doc.data.forEach(function(row) {
                    if (invalidCodes.indexOf(row.code) !== -1) { return; }
                    doc[row.code] = row.value;
                    if (validCodes.indexOf(row.code) === -1) {
                        validCodes.push(row.code);
                    }
                });
            });
            validCodes = _.sortBy(validCodes);

            var mappingTable = {};
                mappings = _.sortBy(mappings, 'ACC_CODE');
            mappings.forEach(function(mapping) {
                var spaces = 0;
                var name = mapping.ACC_NM_C;
                for (var i = 0; i < name.length; i++) {
                    if (name.substr(i, 1)===' ') {
                        spaces++;
                    }else{
                        break;
                    }
                }
                mappingTable[mapping.ACC_CODE] = {
                    name: name,
                    spaces: spaces
                };
            });

            var noMillionCodes = [
                '3490000',
                '3480000',
                '3400000',
                '3350000',
                '3340000',
            ];
            var noRateCodes = [
                '3490000',
                '3480000',
                '3400000',
                '3350000',
                '3340000',
            ];
            docs.forEach(function(doc) {
                var result = {year: doc.year, quarter: doc.quarter, type: doc.type, showRate: true, data: []};
                validCodes.forEach(function(code) {
                    var value = rate = null;
                    if (!mappingTable[code]) {
                        return;
                    }
                    var name = mappingTable[code].name || '未知欄位';
                    var spaces = mappingTable[code].spaces;
                    if (spaces > 6) {
                        return;
                    }
                    if (_.isNumber(doc[code])) {
                        value = (noMillionCodes.indexOf(code) !== -1) ? +doc[code].toFixed(2) : (doc[code]/1000000).toFixed(2);
                        rate = (noRateCodes.indexOf(code) !== -1) ? null : (doc[code]/doc['1000000']).toFixed(4); 
                    }
                    result.data.push({
                        code: code,
                        name: name,
                        spaces: spaces,
                        value: value,
                        rate: rate
                    });
                });
                results.push(result);
            });
            return results;
        }).then(function(tempResults) {
            // only leave one type for same y/q (prefer to use type 2, then type 1, type 0)
            var results = [];
            tempResults.forEach(function(tempResult, idx) {
                if (idx === 0 || (tempResults[idx].year !== tempResults[idx-1].year || tempResults[idx].quarter !== tempResults[idx-1].quarter)) {
                    results.push(tempResults[idx]);
                }
            });
            if (results.length === 1) {
                results.push(_.cloneDeep(results[0]));
            }

            return {'accu': results, 'season': []};
        });
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

    updateOneRow : function(data, type, option) {
        return this.update({
            'ct_code':   data.ct_code,
            'year':      Number(data.yq.substr(0, 4)),
            'quarter':   Number(data.yq.substr(4)),
            'type':      type,
        }, {
            $set: {
                'symbol_id':  data.list_code,
                'updated_at': new Date()
            },
            $addToSet: {
                data: { 
                    code: data.acc_code, 
                    value: data.data_value,
                }
            }
        }, { upsert: true }).exec().then(function() {
            return true;
        });
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var type;
        if (fromColId === 'IFRSQABS') {
            type = 0;
        }else if (fromColId === 'IFRSQBBS') {
            type = 1;
        }else if (fromColId === 'IFRSQCBS') {
            type = 2;
        }else{
            throw new Error('wrong colId: ' + fromColId);
        }
        var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
            data = dataUtils.lowerCaseKeys(data);

        var match = {
            'ct_code':   data.ct_code,
            'year':      Number(data.yq.substr(0, 4)),
            'quarter':   Number(data.yq.substr(4)),
            'type':      type,
            'data.code': data.acc_code,
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
                return self.updateOneRow(data, type);
            }
        }).catch(function(error) {
            if (error.code === 11000) {
                // duplicated due to map execution
                return self.updateOneRow(data, type);
            } else {
                throw new Error(error);
            }
        });
    },

    removeData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var type;
        if (fromColId === 'IFRSQABS') {
            type = 0;
        }else if (fromColId === 'IFRSQBBS') {
            type = 1;
        }else if (fromColId === 'IFRSQCBS') {
            type = 2;
        }else{
            throw new Error('wrong colId: ' + fromColId);
        }
        var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
            data = dataUtils.lowerCaseKeys(data);

        var match = {
            ct_code:   data.ct_code,
            year:      Number(data.yq.substr(0, 4)),
            quarter:   Number(data.yq.substr(4)),
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

module.exports = BalanceSheetSchema;
