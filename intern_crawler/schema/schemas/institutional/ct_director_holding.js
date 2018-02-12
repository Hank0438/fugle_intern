var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var HoldingInfoSchema = new Schema({
	unique_id   : { type: String },
	title_id    : { type: String },
	rep_id      : { type: String },
	title_nm_c  : { type: String },
	nm_c_f      : { type: String },
	rep_nm_c    : { type: String },
	on_stkno    : { type: Number },
	market_buy  : { type: Number },
	market_sal  : { type: Number },
	hld_stkno   : { type: Number },
	hld_rate    : { type: Number },
	on_stk_rat  : { type: Number },
	p_hld_stkno : { type: Number },	
},{
    _id: false
});

var DirectorHoldingSchema = new Schema({
	ct_code      : { type: String },
	scu_code     : { type: String },
	symbol_id    : { type: String },
	ym           : { type: String },
	holding_info : [HoldingInfoSchema]
},  {
	collection : 'ct_director_holding',
});

DirectorHoldingSchema.plugin(updatedPlugin);
DirectorHoldingSchema.index({ct_code: 1, scu_code: 1, ym: 1}, {unique: true});
DirectorHoldingSchema.index({symbol_id: 1});
DirectorHoldingSchema.index({ym: -1});

DirectorHoldingSchema.statics = {
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

    updateOneRow: function(data) {
        return this.update({
            ct_code: data.ct_code,
            scu_code: data.scu_code,
            ym: data.ym,
        }, {
            $set: {
                'symbol_id':  data.list_code,
                'updated_at': new Date()
            },
            $addToSet: { 
                'holding_info': data 
            }
        }, { upsert: true }).exec().then(function() {
            return true;
        });
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

        var match = {
			ct_code: data.ct_code,
			scu_code: data.scu_code,
			ym: data.ym,
            holding_info: {
                $elemMatch: {
                    unique_id: data.unique_id,
                    title_id: data.title_id,
                    rep_id: data.rep_id,
                }
            }
        };
        return this.update(match, {
            $set: { 
				symbol_id: data.list_code,
            	'holding_info.$': data
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
                return self.updateOneRow(data);
            }
        }).catch(function(err) {
            if(err.code === 11000) {
				// fallback to update again
                return self.updateOneRow(data);
            }else{
            	console.log(fromDbId + ' ' + fromColId + ' error: ' + err);
            }
        });
    },

    removeData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
            data = dataUtils.lowerCaseKeys(data);

        var match = {
            ct_code: data.ct_code,
            scu_code: data.scu_code,
            ym: data.ym,
        };
        return this.findOneAndUpdate(match, {
            $pull: {
                holding_info: {
                    unique_id: data.unique_id,
                    title_id: data.title_id,
                    rep_id: data.rep_id
                }
            }
        }).exec().then(function(response) {
            if (response) {
                var dataInOldDoc = response.holding_info.findIndex(function(x) { 
                    return x.unique_id === data.unique_id && 
                        x.title_id === data.title_id &&
                        x.rep_id === data.rep_id;
                }) !== -1;
                if (response.holding_info.length === 1 && dataInOldDoc) {
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

module.exports = DirectorHoldingSchema;
