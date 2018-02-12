var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var DailyData = new Schema({
	date       : { type: Date },
	frn_buy    : { type: Number },
	frn_sell   : { type: Number },
	frn_amt    : { type: Number },
	frn_net    : { type: Number },
	ith_buy    : { type: Number },
	ith_sell   : { type: Number },
	ith_amt    : { type: Number },
	ith_net    : { type: Number },
	ith_buy_1  : { type: Number },
	ith_sell_1 : { type: Number },
	ith_amt_1  : { type: Number },
	ith_net_1  : { type: Number },
	dlr_buy    : { type: Number },
	dlr_sell   : { type: Number },
	dlr_amt    : { type: Number },
	dlr_net    : { type: Number },
	dlr_buy_p  : { type: Number },
	dlr_sell_p : { type: Number },
	dlr_amt_p  : { type: Number },
	dlr_net_p  : { type: Number },
	dlr_buy_h  : { type: Number },
	dlr_sell_h : { type: Number },
	dlr_amt_h  : { type: Number },
	dlr_net_h  : { type: Number },
},{
    _id: false
});

var InstitutionTxSchema = new Schema({
	ct_code   : { type: String },
	scu_code  : { type: String },
	symbol_id : { type: String },
	year      : { type: Number },
	history   : [DailyData]
},  {
	collection : 'ct_institution_tx',
});

InstitutionTxSchema.plugin(updatedPlugin);
InstitutionTxSchema.index({ct_code: 1, scu_code: 1, year: -1}, {unique: true});
InstitutionTxSchema.index({symbol_id: 1});
InstitutionTxSchema.index({year: -1});

InstitutionTxSchema.statics = {
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

    preProcess : function(row, fromDbId, fromColId, fromColSchema) {
        var dailyData = {};
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

        if (fromColId === 'FRNSWD') {
			dailyData = {
				frn_buy:  data.buy_shr,
				frn_sell: data.sell_shr,
				frn_net:  data.chg_stk,
				frn_amt:  data.chg_amt,
			};
        }else if (fromColId === 'DLRNTD') {
        	dailyData = _.pick(data, [
				'dlr_buy', 'dlr_sell', 'dlr_amt', 'dlr_net', 
				'dlr_buy_p', 'dlr_sell_p', 'dlr_amt_p', 'dlr_net_p', 
				'dlr_buy_h', 'dlr_sell_h', 'dlr_amt_h', 'dlr_net_h'
        	]);
        }else if (fromColId === 'FRNNED') {
        	dailyData = _.pick(data, [
				'ith_buy', 'ith_sell', 'ith_amt', 'ith_net', 
				'ith_buy_1', 'ith_sell_1', 'ith_amt_1', 'ith_net_1'
        	]);
        }else if (fromColId === 'FRNEND') {
        	dailyData = _.pick(data, [
				'frn_net', 'ith_net', 'dlr_net', 
        	]);
        }

		data.symbol_id = data.list_code;
		data.year = moment(data.ymd, 'YYYYMMDD').year();
		dailyData.date = moment(data.ymd, 'YYYYMMDD').toDate();
		return {
			data: data,
			dailyData: dailyData
		};
    },

	updateOneRow: function(data, dailyData) {
		var updateOps = {
			 $addToSet: { 'history': dailyData },
			 $set: {
				'updated_at': new Date()				 
			 }
		};
		if (data.symbol_id) { updateOps['$set']['symbol_id'] = data.symbol_id; }
		return this.update({
			ct_code   : data.ct_code,
			scu_code  : data.scu_code,
			year      : data.year
		}, updateOps, { upsert: true }).exec().then(function() {
            return true;
        });
	},

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
    	var temp = this.preProcess(row, fromDbId, fromColId, fromColSchema);
    	var data = temp.data;
    	var dailyData = temp.dailyData;

        var match = {
			ct_code   : data.ct_code,
			scu_code  : data.scu_code,
			year      : data.year,
			'history.date' : dailyData.date
        };
		var setFields = {};
		if (data.symbol_id) { setFields['symbol_id'] = data.symbol_id; }
		_.each(dailyData, function(val, key) {
			setFields['history.$.'+key] = val;
		});
        return this.update(match, {
            $set: setFields
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
        }).catch(function(error) {
            if (error.code === 11000) {
                // duplicated due to map execution
                return self.updateOneRow(data);
            } else {
                throw new Error(error);
            }
        });
    },

    removeData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
    	var temp = this.preProcess(row, fromDbId, fromColId, fromColSchema);
    	var data = temp.data;
    	var dailyData = temp.dailyData;

        var match = {
			ct_code   : data.ct_code,
			scu_code  : data.scu_code,
			year      : data.year
        };
        return this.findOneAndUpdate(match, {
            $pull: {
                history: {
                    date: dailyData.date,
                }
            }
        }).exec().then(function(response) {
            if (response) {
                var dataInOldDoc = response.history.findIndex(function(x) { return x.date === dailyData.date; }) !== -1;
                if (response.history.length === 1 && dataInOldDoc) {
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

module.exports = InstitutionTxSchema;
