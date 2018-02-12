var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var InvestSchema = new Schema({
	ct_code       : { type: String },
	symbol_id     : { type: String },
	date          : { type: Date },
	seq_no        : { type: String },
	nm_c_f        : { type: String },
	opt_item      : { type: String },
	add_c         : { type: String },
	cur_nm_c      : { type: String },
	cost          : { type: Number },
	hold_no       : { type: Number },
	rat           : { type: Number },
	inv_cur_nm    : { type: String },
	inv_amt       : { type: Number },
	acc_kind      : { type: String },
	income        : { type: Number },
	cur_income    : { type: Number },
	nt_cost       : { type: Number },
	nt_inv_amt    : { type: Number },
	nt_income     : { type: Number },
	nt_cur_inc    : { type: Number },
	cash_div      : { type: Number },
	zclose        : { type: Number },
	mkt_value     : { type: Number },
	inv_mkt_value : { type: Number },
},  {
	collection : 'ct_invest',
});

InvestSchema.plugin(updatedPlugin);
InvestSchema.index({ct_code: 1, date: -1, seq_no: 1}, {unique: true});
InvestSchema.index({symbol_id: 1});
InvestSchema.index({date: -1});

InvestSchema.statics = {
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
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

		data.symbol_id = data.list_code;
		data.date = moment(data.ymd, 'YYYYMMDD').toDate();

        var match = {
			ct_code : data.ct_code,
			date  	: data.date,
			seq_no  : data.seq_no,
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
		var data = dataUtils.resetNonsenseNumbers(row, fromColSchema);
			data = dataUtils.lowerCaseKeys(data);

		data.date = moment(data.ymd, 'YYYYMMDD').toDate();

        return this.findOneAndRemove({
			ct_code : data.ct_code,
			date  	: data.date,
			seq_no  : data.seq_no,
		}).exec().then(function(response) {
			return !!response;
		});
    }
};

module.exports = InvestSchema;
