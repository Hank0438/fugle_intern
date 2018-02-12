var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var HoldInfoSchema = new Schema({
    hold_code:  { type: String },
    body_count: { type: Number },
    stk_no: 	{ type: Number },
    hold_rate:  { type: Number }
},{
    _id: false
});

var StockDistributionSchema = new Schema({
	ct_code:    { type: String },
    symbol_id:  { type: String },
    ym: 		{ type: String },
    hold_info:  [HoldInfoSchema]
},  {
    collection : 'ct_stock_distribution',
});

StockDistributionSchema.plugin(updatedPlugin);
StockDistributionSchema.index({ct_code: 1, ym: -1}, {unique: true});
StockDistributionSchema.index({symbol_id: 1});
StockDistributionSchema.index({ym: -1});

StockDistributionSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}).exec();
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

	updateOneRow: function(row, holdInfo) {
		return this.update({
            ct_code: row.CT_CODE,
            ym: row.YM,
		}, {
            $set: {
                symbol_id: row.LIST_CODE,
				updated_at: new Date()				 
            },
            $addToSet: { 
                'hold_info': holdInfo 
            }
        }, { upsert: true }).exec().then(function() {
            return true;
        });
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
		var holdInfo = {
			hold_code:  row.HOLD_CODE,
			body_count: row.BODY_COUNT,
			stk_no: 	row.STK_NO,
			hold_rate:  row.HOLD_RATE
    	};

        var match = {
            ct_code: row.CT_CODE,
            ym: row.YM,
            'hold_info.hold_code': holdInfo.hold_code
        };
        return this.update(match, {
            $set: { 
                symbol_id: row.LIST_CODE,
                'hold_info.$': holdInfo 
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
                return self.updateOneRow(row, holdInfo);
            }
        }).catch(function(error) {
            if (error.code === 11000) {
                // duplicated due to map execution
                return self.updateOneRow(row, holdInfo);
            } else {
                throw new Error(error);
            }
        });
    },

    removeData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var holdInfo = {
            hold_code:  row.HOLD_CODE,
            body_count: row.BODY_COUNT,
            stk_no:     row.STK_NO,
            hold_rate:  row.HOLD_RATE
        };

        var match = {
            ct_code: row.CT_CODE,
            ym: row.YM,
        };
        return this.findOneAndUpdate(match, {
            $pull: {
                hold_info: {
                    hold_code: holdInfo.hold_code,
                }
            }
        }).exec().then(function(response) {
            if (response) {
                var dataInOldDoc = response.hold_info.findIndex(function(x) { return x.hold_code === holdInfo.hold_code; }) !== -1;
                if (response.hold_info.length === 1 && dataInOldDoc) {
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

module.exports = StockDistributionSchema;
