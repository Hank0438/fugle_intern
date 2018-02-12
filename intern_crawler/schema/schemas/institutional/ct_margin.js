var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var DailyDataSchema = new Schema({
	date         : { type: Date },
	mar_buy_q    : { type: Number },
	mar_sal_q    : { type: Number },
	mar_pay_q    : { type: Number },
	mar_rest_q   : { type: Number },
	mar_lmt_q    : { type: Number },
	mar_use_r    : { type: Number },
	mar_turn     : { type: Number },
	mar_rest_chg : { type: Number },
	mar_rest_r   : { type: Number },
	mar_vol_r    : { type: Number },
	lon_sal_q    : { type: Number },
	lon_buy_q    : { type: Number },
	lon_pay_q    : { type: Number },
	lon_rest_q   : { type: Number },
	lon_lmt_q    : { type: Number },
	lon_use_r    : { type: Number },
	lon_turn     : { type: Number },
	lon_rest_chg : { type: Number },
	lon_rest_r   : { type: Number },
	lon_vol_r    : { type: Number },
	crd_ratio    : { type: Number },
	net_o_bal    : { type: Number },
	lon_sho_r    : { type: Number },
	mar_b_s_r    : { type: Number },
	lon_b_s_r    : { type: Number },
	zclose       : { type: Number },
	mar_ysd_q    : { type: Number },
	lon_ysd_q    : { type: Number },
	offset       : { type: Number },
	remark       : { type: String },
	mar_sfc      : { type: Number },
	lon_sfc      : { type: Number },
	o_bal_r      : { type: Number },
	mar_pcnt     : { type: Number },
	sup_rat      : { type: String },
	sup_dpst     : { type: String },
	raise_dpst   : { type: String },
},{
    _id: false
});

var MarginSchema = new Schema({
	ct_code   : { type: String },   
	scu_code  : { type: String },    
	symbol_id : { type: String },     
	year      : { type: Number },
	history   : [DailyDataSchema]
},  {
	collection : 'ct_margin',
});

MarginSchema.plugin(updatedPlugin);
MarginSchema.index({ct_code: 1, scu_code: 1, year: -1}, {unique: true});
MarginSchema.index({symbol_id: 1});
MarginSchema.index({year: -1});

MarginSchema.statics = {
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
		var updateOps = {
			 $addToSet: { 'history': data },
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
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

		data.symbol_id = data.list_code;
		data.date = moment(data.ymd, 'YYYYMMDD').toDate();
		data.year = moment(data.ymd, 'YYYYMMDD').year();

        var match = {
			ct_code   : data.ct_code,
			scu_code  : data.scu_code,
			year      : data.year,
			'history.date' : data.date
        };
		var setFields = { 'history.$': data };
		if (data.symbol_id) { setFields['symbol_id'] = data.symbol_id; }
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
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

		data.symbol_id = data.list_code;
		data.date = moment(data.ymd, 'YYYYMMDD').toDate();
		data.year = moment(data.ymd, 'YYYYMMDD').year();

        var match = {
			ct_code   : data.ct_code,
			scu_code  : data.scu_code,
			year      : data.year
        };
        return this.findOneAndUpdate(match, {
            $pull: {
                history: {
                    date: data.date,
                }
            }
        }).exec().then(function(response) {
            if (response) {
                var dataInOldDoc = response.history.findIndex(function(x) { return x.date === data.date; }) !== -1;
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

module.exports = MarginSchema;
