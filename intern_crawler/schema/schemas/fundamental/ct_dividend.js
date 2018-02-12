var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var DividendSchema = new Schema({
	ct_code:      { type: String },
	scu_code:     { type: String },
    symbol_id:    { type: String },
    div_year:     { type: Number },
    issue_year:   { type: Number },
    xd_date:      { type: Date },
    xr_date:      { type: Date },
    cash_div:     { type: Number },
    ern_div:      { type: Number },
    cap_div:      { type: Number },
    stk_div:      { type: Number },
    tot_div:      { type: Number },
    xr_base_date: { type: Date },
    cern_div:     { type: Number },
    ccap_div:     { type: Number },
},  {
	collection : 'ct_dividend',
});

DividendSchema.plugin(updatedPlugin);
DividendSchema.index({ct_code: 1, scu_code: 1, div_year: 1, xd_date: 1, xr_base_date: 1}, {unique: true});
DividendSchema.index({symbol_id: 1});
DividendSchema.index({div_year: 1});

DividendSchema.statics = {
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
		row = dataUtils.resetNonsenseNumbers(row, fromColSchema);
    	data = {
			ct_code: row.CT_CODE,
			scu_code: row.SCU_CODE,
			symbol_id: row.LIST_CODE,
			div_year: row.DIV_YY,
			issue_year: row.RISU_YY,
			xd_date: row.CSHDIV_DT.trim() ? moment(row.CSHDIV_DT, 'YYYYMMDD').toDate() : null,
			xr_date: row.RISU_YMD.trim() ? moment(row.RISU_YMD, 'YYYYMMDD').toDate() : null,
			cash_div: row.CASH_DIV,
			ern_div: row.ERN_DIV,
			cap_div: row.CAP_DIV,
			stk_div: row.STK_DIV,
			tot_div: row.TOT_DIV,
			xr_base_date: row.RISU_B_YMD.trim() ? moment(row.RISU_B_YMD, 'YYYYMMDD').toDate() : null,
			cern_div: row.CERN_DIV,
			ccap_div: row.CCAP_DIV,
    	};
        var match = {
			ct_code: data.ct_code,
			scu_code: data.scu_code,
			div_year: data.div_year,
			xd_date: data.xd_date,
			xr_base_date: data.xr_base_date,
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
        var data = dataUtils.resetNonsenseNumbers(row, fromColSchema)
            data = dataUtils.lowerCaseKeys(data);
        return this.findOneAndRemove({
            ct_code: data.ct_code,
            scu_code: data.scu_code,
            div_year: data.div_year,
            xd_date: data.cshdiv_dt ? moment(data.cshdiv_dt, 'YYYYMMDD').toDate() : null,
            xr_base_date: data.risu_b_ymd ? moment(data.risu_b_ymd, 'YYYYMMDD').toDate() : null,
		}).exec().then(function(response) {
			return !!response;
		});
    }
};

module.exports = DividendSchema;
