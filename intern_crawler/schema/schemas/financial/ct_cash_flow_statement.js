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

var CashFlowStatementSchema = new Schema({
    ct_code:   { type: String },
    symbol_id: { type: String },
    year:      { type: Number },
    quarter:   { type: Number },
    type:      { type: Number }, // 0:個別, 1:個體, 2:合併
    data:      [ AccountRow ],
},  { 
    collection : 'ct_cash_flow_statement',
});

CashFlowStatementSchema.plugin(updatedPlugin);
CashFlowStatementSchema.index({ct_code: 1, year: -1, quarter: -1, type: -1}, {unique: true});
CashFlowStatementSchema.index({symbol_id: 1, year: -1, quarter: -1, type: -1});
CashFlowStatementSchema.index({'data.code': 1});

CashFlowStatementSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}).exec();
    },

    get2y : function(symbolId) {
        var self = this;
        var models = require('../../aggregate/connections').models;
        var FINFATCF = models['FINFATCF'];
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
            .sort({year: -1, quarter: -1})
            .limit(8)
            .lean()
            .exec()
        ).then(function(docs) {
            var getMappings = Promise.resolve(FINFATCF.getAll());
            return [docs, getMappings];
        }).spread(function(docs, mappings) {
            if (!docs.length) { return []; }

            // keep code if have mapping data
            var results = [];
            var validCodes = [];
            _.each(docs, function(doc) {
                _.each(doc.data, function(row) {
                    doc[row.code] = row.value;
                    if (validCodes.indexOf(row.code) === -1) {
                        validCodes.push(row.code);
                    }
                });
            });
            validCodes = _.sortBy(validCodes);

            var mappingTable = {};
                mappings = _.sortBy(mappings, 'ACC_CODE');
            _.each(mappings, function(mapping) {
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

            _.each(docs, function(doc) {
                var result = {year: doc.year, quarter: doc.quarter, type: doc.type, showRate: false, data: []};
                _.each(validCodes, function(code) {
                    var name = mappingTable[code].name || '未知欄位';
                    var spaces = mappingTable[code].spaces;
                    if (spaces > 6) {
                        return;
                    }
                    result.data.push({
                        code: code,
                        name: name,
                        spaces: spaces,
                        value: doc[code] ? (doc[code]/1000000).toFixed(2) : null,
                        rate: null
                    });
                });
                results.push(result);
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

    updateOneRow : function(data, type) {
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
        if (fromColId === 'IFRSQACF') {
            type = 0;
        }else if (fromColId === 'IFRSQBCF') {
            type = 1;
        }else if (fromColId === 'IFRSQCCF') {
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
        if (fromColId === 'IFRSQACF') {
            type = 0;
        }else if (fromColId === 'IFRSQBCF') {
            type = 1;
        }else if (fromColId === 'IFRSQCCF') {
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

module.exports = CashFlowStatementSchema;
