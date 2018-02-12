var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var CompanyBasicSchema = new Schema({
	symbol_id: {type: String},
	ct_code: {type: String},
	list_code: {type: String},
	nm_c: {type: String},
	nm_e: {type: String},
	nm_c_f: {type: String},
	nm_e_f: {type: String},
	est_date: {type: String},
	list_date1: {type: String},
	list_date: {type: String},
	loff_date: {type: String},
	e_date: {type: String},
	ind_code: {type: String},
	grp_nm_c: {type: String},
	co_code: {type: String},
	zip: {type: String},
	add_c: {type: String},
	add_e: {type: String},
	tel: {type: String},
	fax: {type: String},
	url: {type: String},
	e_mail: {type: String},
	pre_nm_c: {type: String},
	gel_nm_c: {type: String},
	fin_nm_c: {type: String},
	spk_nm_c: {type: String},
	spk_tit: {type: String},
	spk_tel: {type: String},
	spk_fax: {type: String},
	spk_nmc1: {type: String},
	spk_tit1: {type: String},
	spk_tel1: {type: String},
	spk_fax1: {type: String},
	stk_dept: {type: String},
	stk_tel: {type: String},
	stk_add: {type: String},
	opt_item: {type: String},
	fin_rmk: {type: String},
	acc_mm: {type: String},
	atc_nm_c: {type: String},
	acc_amt: {type: String},
	amt_0: {type: String},
	amt_b: {type: String},
	bnd_rmk: {type: String},
	emp_tot: {type: String},
	market: {type: String},
	mkt_ind_code: {type: String},
	risu_ymd: {type: String},
	secu_stat: {type: String},
	pub_date: {type: String},
	cancel_ymd: {type: String},
	ntn_regist: {type: String},
	lg_agt_nmc: {type: String},
	lg_agt_nme: {type: String},
	lg_agt_tel: {type: String},
	lg_agt_adc: {type: String},
	lg_agt_ade: {type: String},
	deps_insit: {type: String},
	cust_insit: {type: String},
	tdr_untshr: {type: String},
	olist_mkt: {type: String},
	olist_code: {type: String},
	opr_item: {type: String},
	tse_date: {type: String},
	otc_date: {type: String},
	emg_date: {type: String},
	tse_off_date: {type: String},
	otc_off_date: {type: String},
	emg_off_date: {type: String},
	emp_yy: {type: String},
	emp_avg_age: {type: String},
	emp_avg_w_y: {type: String},
	emp_doctor: {type: String},
	emp_master: {type: String},
	emp_unv: {type: String},
	emp_hsc: {type: String},
	tdr_org_pubshr: {type: String},
	list_kind: {type: String},
	nm_c_tse: {type: String},
}, {
	collection : 'ct_company_basic',
});

CompanyBasicSchema.plugin(updatedPlugin);
CompanyBasicSchema.index({ct_code: 1}, {unique: true});
CompanyBasicSchema.index({symbol_id: 1});

CompanyBasicSchema.statics = {
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

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
		var self = this;
		var fieldsToTrim = ['NM_C', 'NM_C_F', 'NM_C_TSE'];
		var data = {};
		_.each(row, function(val, key) {
			if (_.contains(fieldsToTrim, key)) {
				val = val.replace(/\s/g, '');
			}
			data[key.toLowerCase()] = val;
		});
		data.symbol_id = data.list_code;

        var match = {
			ct_code: data.ct_code
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
        var data = dataUtils.lowerCaseKeys(row);
		return this.findOneAndRemove({
			ct_code: data.ct_code
		}).exec().then(function(response) {
			return !!response;
		});
    }
};

module.exports = CompanyBasicSchema;
