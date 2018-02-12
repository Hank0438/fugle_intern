var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var RevenueSchema = new Schema({
	ct_code	        : { type: String },
	symbol_id	    : { type: String },
	ym	            : { type: String },
	sales	        : { type: Number },
	s_m_r	        : { type: Number },
	s_y_r	        : { type: Number },
	acc_sales	    : { type: Number },
	a_s_y_r	        : { type: Number },
	a_sale_fis	    : { type: Number },
	a_s_f_y_r	    : { type: Number },
	a_s_r	        : { type: Number },
	m_earn_ann	    : { type: Number },
	e_lm_r	        : { type: Number },
	e_m_r	        : { type: Number },
	a_earn_cal	    : { type: Number },
	a_e_y_r	        : { type: Number },
	earn	        : { type: Number },
	e_y_r	        : { type: Number },
	a_e_r	        : { type: Number },
	lnb_amt	        : { type: Number },
	lnl_amt	        : { type: Number },
	edo_amt	        : { type: Number },
	eps	            : { type: Number },
	sales_prv	    : { type: Number },
	acc_sales_prv	: { type: Number },
	m_earn_ann_prv	: { type: Number },
	a_earn_cal_prv	: { type: Number },
	edo_rate	    : { type: Number },
	lnb_rate	    : { type: Number },
	sales_per	    : { type: Number },
	a_sales_per	    : { type: Number },
	earn_per	    : { type: Number },
	a_earn_per	    : { type: Number },
	sales_m	        : { type: Number },
	sale_m_pre	    : { type: Number },
	s_m_y_r	        : { type: Number },
	a_s_f_m	        : { type: Number },
	acc_sale_m	    : { type: Number },
	lnb_amt_prv	    : { type: Number },
	edo_cur_code	: { type: String },
	edo_amt_chg	    : { type: Number },
	sales_chg	    : { type: Number },
	acc_sales_chg	: { type: Number },
	earn_ann_per_f	: { type: Number },
	s_m_m_r	        : { type: Number },
	a_s_m_pre	    : { type: Number },
	sales_m_chg	    : { type: Number },
	a_s_m_chg	    : { type: Number },
	a_s_m_y_r	    : { type: Number },
	e_sales	        : { type: Number },
	notice_ymd	    : { type: String },
	ymd_ann	        : { type: String },
	acc_captal	    : { type: Number },
	m_m_earn_ann	: { type: Number },
	m_e_lm_r	    : { type: Number },
	m_e_m_r	        : { type: Number },
	m_ymd_ann	    : { type: String },
	m_earn	        : { type: Number },
	m_e_y_r	        : { type: Number },
	a_s_f_m_y_r	    : { type: Number },
},  {
	collection : 'ct_revenue',
});

RevenueSchema.plugin(updatedPlugin);
RevenueSchema.index({ct_code: 1, ym: -1}, {unique: true});
RevenueSchema.index({symbol_id: 1});
RevenueSchema.index({ym: -1});

RevenueSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}).exec();
    },

    bulkUpdateData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var symbolIds = [];
        return Promise.map(rows, function(row) {
            return self.updateData(row, fromDbId, fromColId, fromColSchema).then(function(updated) {
                if (updated) { symbolIds.push(row.ID7); }
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
                if (updated) { symbolIds.push(row.ID7); }
            });
        }, {concurrency: MAX_CONCURRENT_WRITES}).then(function() {
            return _.uniq(symbolIds);
        });
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
    	var self = this;
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

		data.symbol_id = data.id7;

        var match = {
			ct_code: data.ct_code,
			ym: data.ym
		};
		return this.update(match, data, {upsert: true}).exec().then(function(response) {
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

    removeData : function(row, fromDbId, fromColId, fromColSchema) {
    	var self = this;
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

		return this.findOneAndRemove({
			ct_code: data.ct_code,
			ym: data.ym
		}).exec().then(function(response) {
			return !!response;
		});
    }
};

module.exports = RevenueSchema;
