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

var IncomeStatementSchema = new Schema({
    ct_code:   { type: String },
    symbol_id: { type: String },
    year:      { type: Number },
    quarter:   { type: Number },
    type:      { type: Number }, // 0:個別, 1:個體, 2:合併
    data:      [ AccountRow ],
},  {
    collection : 'ct_income_statement',
});

IncomeStatementSchema.plugin(updatedPlugin);
IncomeStatementSchema.index({ct_code: 1, year: -1, quarter: -1, type: -1}, {unique: true});
IncomeStatementSchema.index({symbol_id: 1, year: -1, quarter: -1, type: -1});
IncomeStatementSchema.index({'data.code': 1});

IncomeStatementSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}).exec();
    },

    get2y : function(symbolId) {
        var self = this;
        var models = require('../../aggregate/connections').models;
        var FINFATIS = models['FINFATIS'];
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
            .limit(9)
            .lean()
            .exec()
        ).then(function(docs) {
            var getMappings = Promise.resolve(FINFATIS.getAll());
            return [docs, getMappings];
        }).spread(function(docs, mappings) {
            if (!docs.length) { return []; }

            var totalCode = '5000000'; // 營業收入合計

            // do not show these fields
            var invalidCodes = [
                '8050000', '8100000', '9010600', '9010800', '9011000', '9011200', '9011400', '9011600', 
                '9011800', '9012000', '9012200', '9012400', '9012600', '9012800', '9013000', '9013200', 
                '9013400', '9013600', '9013800', '9014000', '9014200', '9014400', '9014600', '9014800', 
                '9015000', '9050400', '9050600', '9050800', '9051000', '9051200', '9051400', '9051600', 
                '9051800', '9052000', '9052200', '9052400', '9052600', '9052800', '9053000', '9053200', 
                '9053400', '9053600', '9053800', '9054000', '9054200', '9054400', '9054600', '9054800', 
                '9100200', '9100400', '9100600', '9100800', '9101000', '9101200', '9101400', '9101600', 
                '9101800', '9102000', '9102200', '9102400', '9102600', '9102800', '9103000', '9103200', 
                '9103400', '9103600', '9103800', '9300000', 'A100000', 'A100500', 'A101000', 'C100000', 
                'C150000', 'C150100', 'C150500', 'C150600', 'C151000', 'C151500', 'C152000', 'C152500', 
                'C153000', 'C153500', 'C270000', 'C351000', 'C353000', 'C400000', 'C400400', 'C400401', 
                'C400402', 'C401000', 'C401500', 'C401501', 'C401502', 'C402000', 'C402100', 'C402101', 
                'C402102', 'C402500', 'C403000', 'C403001', 'C403002', 'C403500', 'C403501', 'C403502', 
                'C403700', 'C404000', 'C404001', 'C404002', 'C404005', 'C404010', 'C404015', 'C404020', 
                'C404025', 'C404030', 'C404035', 'C404040', 'C404045', 'C404200', 'C404201', 'C404202', 
                'C404205', 'C404210', 'C404215', 'C404220', 'C404225', 'C404230', 'C404235', 'C404240', 
                'C404245', 'C404500', 'C404900', 'C404901', 'C404902', 'C405000', 'C405001', 'C405002', 
                'C406000', 'C406100', 'C406300', 'C406400', 'C406600', 'C406606', 'C406607', 'C406700',
                'C406706', 'C406707', 'C407500', 'C407506', 'C407507', 'C407600', 'C407606', 'C407607',
                'C408400', 'C410000', 'C420000', 'C430000', 'C440000', 'C450100', 'C450300', 'C550000', 
                'C550500', 'C550800', 'C551000', 'D010000', 'D050000', 'E010000', 'E050000', 'Z000005', 
                'Z000004', 'Z000003', 'Z000002',
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
            validCodes = _.sortBy(validCodes, function(code) {
                if (code.substr(0, 1) === 'H') {
                    return '0000'+code;
                }else{
                    return code;
                }
            });
            if (validCodes.indexOf(totalCode) === -1) {
                totalCode = '4000000'; // 收益
            }
            if (validCodes.indexOf(totalCode) === -1) {
                totalCode = 'H000000'; // 淨收益
            }

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
                'E000000',
                'D000000',
                'Z000005',
                'Z000003',
            ];
            var noRateCodes = [
                'E000000',
                'D000000',
                'Z000005',
                'Z000003',
            ];
            docs.forEach(function(doc) {
                var result = {year: doc.year, quarter: doc.quarter, type: doc.type, showRate: true, data: []};
                validCodes.forEach(function(code) {
                    if (!mappingTable[code]) {
                        return;
                    }                    
                    var name = mappingTable[code] ? mappingTable[code].name : '未知欄位';
                    var spaces = mappingTable[code] ? mappingTable[code].spaces : 2;
                    var value = rate = null;
                    if (spaces > 6) {
                        return;
                    }
                    if (_.isNumber(doc[code])) {
                        value = (noMillionCodes.indexOf(code) !== -1) ? +doc[code].toFixed(2) : (doc[code]/1000000).toFixed(2);
                        rate = (noRateCodes.indexOf(code) !== -1) ? null : (doc[code]/doc[totalCode]).toFixed(4); 
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

            // calculate seasonal data
            var seasonalResults = [];
            results.forEach(function(result, idx) {
                if (!results[idx+1]) { return; }
                var total = 0;
                var seasonalResult = {year: result.year, quarter: result.quarter, type: result.type, showRate: true, data: []};
                result.data.forEach(function(cell, cellIdx) {
                    var value;
                    if (result.year !== results[idx+1].year) {
                        value = +cell.value;
                    }else{
                        value = (_.isNumber(+cell.value) && _.isNumber(+results[idx+1].data[cellIdx].value)) ? 
                            +cell.value - +results[idx+1].data[cellIdx].value : null;
                    }
                    if (cell.code === '5000000') { total = value; }                    
                    seasonalResult.data.push({
                        code: cell.code,
                        name: cell.name,
                        spaces: cell.spaces,
                        value: value,
                    });
                });
                seasonalResult.data.forEach(function(cell) {
                    cell.rate = (cell.value && total) ? (cell.value/total).toFixed(4) : null;
                });
                seasonalResults.push(seasonalResult);
            });
            results.pop(); // make two types have same length

            if (results.length === 1) {
                results.push(_.cloneDeep(results[0]));
                seasonalResults.push(_.cloneDeep(seasonalResults[0]));
            }

            return {'accu': results, 'season': seasonalResults};
        });
    },

    getByCode5y : function(symbolId, code) {
        return Promise.resolve(this.find({
            symbol_id: symbolId, 
            year: {$gte:(moment().year()-5)}, 
            type: {$in: [0, 2]}, 
            'data.code': code,
        }, {
            symbol_id: 1, 
            year: 1, 
            quarter: 1, 
            type: 1,
            'data.$': 1
        }).sort({year: -1, quarter: -1, type: -1}).lean().exec()).map(function(result) {
            return {
                year: result.year,
                quarter: result.quarter,
                type: result.type,
                value: result.data[0].value,
                yoy: null,
                accuValue: result.data[0].value,
                accuYoy: null
            };
        }).then(function(tempResults) {
            // only leave one type for same y/q (prefer to use type 2, then type 1, type 0)
            var results = [];
            tempResults.forEach(function(tempResult, idx) {
                if (idx === 0 || (tempResults[idx].year !== tempResults[idx-1].year || tempResults[idx].quarter !== tempResults[idx-1].quarter)) {
                    results.push(tempResults[idx]);
                }
            });

            results.forEach(function(result, idx) {
                // calculate seasonal data
                if (!results[idx+1]) { return; }
                var value = +result.value;
                if (result.year === results[idx+1].year) {
                    value = (_.isNumber(value) && _.isNumber(+results[idx+1].value)) ? 
                        value - +results[idx+1].value : null;
                }
                result.value = value;
                // calculate accuYoy
                var lastYearData = _.find(results, function(el) { return el.year === result.year-1 && el.quarter === result.quarter; });
                if (lastYearData) {
                    result.accuYoy = (result.accuValue - lastYearData.accuValue) / Math.abs(lastYearData.accuValue);
                }
            });
            // seasonal yoy
            results.forEach(function(result, idx) {
                var lastYearData = _.find(results, function(el) { return el.year === result.year-1 && el.quarter === result.quarter; });
                if (lastYearData) {
                    result.yoy = (result.value - lastYearData.value) / Math.abs(lastYearData.value);
                }
            });
            results.pop();

            return results;
        });
    },

    getEps5y : function(symbolId) {
        return this.getByCode5y(symbolId, 'D000000'); // 基本每股盈餘
    },

    getGrossMargin5y: function(symbolId) {
        return this.getByCode5y(symbolId, '8000000'); // 營業毛利（毛損）淨額
    },

    getProfit5y: function(symbolId) {
        return this.getByCode5y(symbolId, 'A000000'); // 營業利益（損失）
    },

    getNetProfit5y: function(symbolId) {
        return this.getByCode5y(symbolId, 'C350000'); // 本期稅後淨利（淨損）
    },

    getRevenue5y: function(symbolId) {
        return this.getByCode5y(symbolId, '5000000'); // 營業收入合計
    },

    getGrossMarginRate5y: function(symbolId) {
        return Promise.join(this.getGrossMargin5y(symbolId), this.getRevenue5y(symbolId), function(margins, revenues) {
            var results = [];
            margins.forEach(function(margin) {
                results.push({
                    year: margin.year,
                    quarter: margin.quarter,
                    margin: margin.value,
                });
            });
            revenues.forEach(function(revenue) {
                var obj = results.find(function(result) { return result.year === revenue.year && result.quarter === revenue.quarter; });
                if (obj) {
                    obj.revenue = revenue.value;
                    obj.value = obj.margin / revenue.value;
                }
            });
            return results.filter(function(result) {
                return result.value;
            });
        });
    },

    getNetProfitRate5y: function(symbolId) {
        return Promise.join(this.getNetProfit5y(symbolId), this.getRevenue5y(symbolId), function(profits, revenues) {
            var results = [];
            profits.forEach(function(profit) {
                results.push({
                    year: profit.year,
                    quarter: profit.quarter,
                    profit: profit.value,
                });
            });
            revenues.forEach(function(revenue) {
                var obj = results.find(function(result) { return result.year === revenue.year && result.quarter === revenue.quarter; });
                if (obj) {
                    obj.revenue = revenue.value;
                    obj.value = obj.profit / revenue.value;
                }
            });
            return results.filter(function(result) {
                return result.value;
            });
        });
    },

    getProfitRate5y: function(symbolId) {
        return Promise.join(this.getProfit5y(symbolId), this.getRevenue5y(symbolId), function(profits, revenues) {
            var results = [];
            profits.forEach(function(profit) {
                results.push({
                    year: profit.year,
                    quarter: profit.quarter,
                    profit: profit.value,
                });
            });
            revenues.forEach(function(revenue) {
                var obj = results.find(function(result) { return result.year === revenue.year && result.quarter === revenue.quarter; });
                if (obj) {
                    obj.revenue = revenue.value;
                    obj.value = obj.profit / revenue.value;
                }
            });
            return results.filter(function(result) {
                return result.value;
            });
        });
    },

    // for calculating per
    getEpsSum1y : function(symbolId) {
        return Promise.resolve(this.find({
                symbol_id: symbolId, 
                type: {$in: [0, 2]}, 
                'data.code': 'D000000',
            }, {
                _id: 0,
                year: 1, 
                quarter: 1, 
                type: 1,
                'data.$': 1
            }).sort({year: -1, quarter: -1, type: -1}).limit(5).lean().exec()
        ).map(function(result) {
            return {
                year: result.year,
                quarter: result.quarter,
                type: result.type,
                eps: result.data[0].value, 
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
        }).then(function(results) {
            if (results.length) {
                var epsSum = results[0].eps; // sum of this year
                var year = results[0].year;
                var lastYq = (results[0].year-1) + '' + results[0].quarter;
                for (var i = 0; i < results.length-1; i++) {
                    var result = results[i];
                    var yq = result.year + '' + result.quarter;
                    if (yq > lastYq && result.year !== year) { 
                        epsSum += result.eps - results[i+1].eps; 
                    }
                }
                return {
                    epsSum: epsSum,
                    detail: results
                };
            }else{
                return {};
            }
        });
    },

    getEpsSum10y : function(symbolId) {
        return Promise.resolve(
            this.find({
                symbol_id: symbolId, 
                year: {$gte:(moment().year()-10)}, 
                quarter: 4,
                type: {$in: [0, 2]}, 
                'data.code': 'D000000',
            }, {
                symbol_id: 1, 
                year: 1, 
                quarter: 1, 
                type: 1,
                'data.$': 1
            }).sort({year: -1, quarter: -1, type: -1}).lean().exec()
        ).map(function(result) {
            return {
                symbol_id: result.symbol_id,
                year: result.year,
                quarter: result.quarter,
                type: result.type,
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
        if (fromColId === 'IFRSQAIS') {
            type = 0;
        }else if (fromColId === 'IFRSQBIS') {
            type = 1;
        }else if (fromColId === 'IFRSQCIS') {
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
        if (fromColId === 'IFRSQAIS') {
            type = 0;
        }else if (fromColId === 'IFRSQBIS') {
            type = 1;
        }else if (fromColId === 'IFRSQCIS') {
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

module.exports = IncomeStatementSchema;
