var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var StockTransferSchema = new Schema({
	ct_code     : { type: String },
	scu_code    : { type: String }, 
	symbol_id   : { type: String },  
	date        : { type: Date },
	title       : { type: String }, 
	nm_c        : { type: String },
	to_whom     : { type: String }, 
	dcl_stkno   : { type: Number },
	hold_stkno  : { type: Number },
	on_stkno    : { type: Number },
	dcl_ratio   : { type: Number },
	dlr_r       : { type: Number },
	zclose      : { type: Number },
	not_sale    : { type: Number },
	no_sale_rsn : { type: String },
	no_sale_dt  : { type: String },
	no_zclose   : { type: Number },
	cur_stkno   : { type: Number },
	unique_id   : { type: String },
	dcl_type    : { type: String },
},  {
	collection : 'ct_stock_transfer',
});

StockTransferSchema.plugin(updatedPlugin);
StockTransferSchema.index({ct_code: 1, scu_code: 1, date: 1, title: 1, nm_c: 1, to_whom: 1}, {unique: true});
StockTransferSchema.index({symbol_id: 1});
StockTransferSchema.index({date: -1});

StockTransferSchema.statics = {
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
			ct_code: data.ct_code,
			scu_code: data.scu_code,
			date: data.date,
			title: data.title,
			nm_c: data.nm_c,
			to_whom: data.to_whom
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

		data.symbol_id = data.list_code;
		data.date = moment(data.ymd, 'YYYYMMDD').toDate();

		return this.findOneAndRemove({
			ct_code: data.ct_code,
			scu_code: data.scu_code,
			date: data.date,
			title: data.title,
			nm_c: data.nm_c,
			to_whom: data.to_whom
		}).exec().then(function(response) {
			return !!response;
		});
   }
};

module.exports = StockTransferSchema;
