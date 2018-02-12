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
	frn_hldno  : { type: Number },
	frn_chgstk : { type: Number },
	frn_hldrat : { type: Number },
	frn_hldamt : { type: Number },
	frn_chgamt : { type: Number },
	frn_invno  : { type: Number },
	frn_invrat : { type: Number },
	ith_hldno  : { type: Number },
	ith_chgstk : { type: Number },
	ith_hldrat : { type: Number },
	ith_hldamt : { type: Number },
	ith_chgamt : { type: Number },
	dlr_hldno  : { type: Number },
	dlr_chgstk : { type: Number },
	dlr_hldrat : { type: Number },
	dlr_hldamt : { type: Number },
	dlr_chgamt : { type: Number },
	tot_hldno  : { type: Number },
	tot_chgstk : { type: Number },
	tot_hldrat : { type: Number },
	tot_hldamt : { type: Number },
	tot_chgamt : { type: Number },
	stkno	   : { type: Number },
},{
    _id: false
});

var InstitutionHoldingSchema = new Schema({
	ct_code   : { type: String },
	scu_code  : { type: String },
	symbol_id : { type: String },
	year      : { type: Number },
	history   : [DailyData]
},  {
	collection : 'ct_institution_holding',
});

InstitutionHoldingSchema.plugin(updatedPlugin);
InstitutionHoldingSchema.index({ct_code: 1, scu_code: 1, year: -1}, {unique: true});
InstitutionHoldingSchema.index({symbol_id: 1});
InstitutionHoldingSchema.index({year: -1});

InstitutionHoldingSchema.statics = {
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

    updateOneRow : function(data) {
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

module.exports = InstitutionHoldingSchema;
