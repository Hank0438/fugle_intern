var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var CalendarSchema = new Schema({
    ct_code:      { type: String },
    scu_code:     { type: String },
    symbol_id:    { type: String },
    type:         { type: Number }, // 1:股東會, 2:除息, 3:現增(認購), 4:除權, 5:現增, 6:董事會
    date:         { type: Date },
    detail:       { type: Schema.Types.Mixed },
},  {
	collection : 'ct_calendar',
});

CalendarSchema.plugin(updatedPlugin);
CalendarSchema.index({ct_code: 1, scu_code: 1, date: 1, type: 1}, {unique: true});
CalendarSchema.index({symbol_id: 1, date: 1});

CalendarSchema.statics = {
    get : function(symbolId){
        return this.findOne({symbol_id: symbolId}).exec();
    },

    bulkUpdateData : function(rows, fromDbId, fromColId, fromColSchema){
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

    bulkRemoveData : function(rows, fromDbId, fromColId, fromColSchema){
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

    preProcess : function(row, fromDbId, fromColId, fromColSchema){
        var rawData = dataUtils.resetNonsenseNumbers(row, fromColSchema);
            rawData = dataUtils.lowerCaseKeys(rawData);
        var data = {};

        if (fromColId === 'FICMET'){
            data = {
                ct_code:   rawData.ct_code,
                scu_code:  null,
                symbol_id: rawData.list_code,
                type:      1,
                date:      moment(rawData.meet_date, 'YYYYMMDD').toDate()
            };
        }else if (fromColId === 'FICCSH'){
            data = {
                ct_code:   rawData.ct_code,
                scu_code:  rawData.scu_code,
                symbol_id: rawData.list_code,
                type:      2,
                date:      moment(rawData.cshdiv_dt, 'YYYYMMDD').toDate()
            };
        }else if (fromColId === 'FICXXX'){
            if (rawData.r_ct_code){
                data = {
                    ct_code:   rawData.ct_code,
                    scu_code:  rawData.scu_code,
                    symbol_id: rawData.list_code,
                    type:      3,
                    date:      moment(rawData.risu_ymd, 'YYYYMMDD').toDate()
                };
            }else if (rawData.div_yy){
                data = {
                    ct_code:   rawData.ct_code,
                    scu_code:  rawData.scu_code,
                    symbol_id: rawData.list_code,
                    type:      4,
                    date:      moment(rawData.risu_ymd, 'YYYYMMDD').toDate()
                };
            }else{
                data = {
                    ct_code:   rawData.ct_code,
                    scu_code:  rawData.scu_code,
                    symbol_id: rawData.list_code,
                    type:      5,
                    date:      moment(rawData.risu_ymd, 'YYYYMMDD').toDate()
                };                
            }
        }else if (fromColId === 'FICPMT'){
            data = {
                ct_code:   rawData.ct_code,
                scu_code:  null,
                symbol_id: rawData.list_code,
                type:      6,
                date:      moment(rawData.meet_date, 'YYYYMMDD').toDate()
            };
        }else if (fromColId === 'FICPCH'){
            data = {
                ct_code:   rawData.ct_code,
                scu_code:  rawData.scu_code,
                symbol_id: rawData.list_code,
                type:      6,
                date:      moment(rawData.meet_date, 'YYYYMMDD').toDate()
            };
        }    
        return data;
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema){
        var self = this;
        var data = this.preProcess(row, fromDbId, fromColId, fromColSchema);
        var match = {
            ct_code : data.ct_code,
            scu_code: data.scu_code,
            date    : data.date,
            type    : data.type,
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

    removeData : function(row, fromDbId, fromColId, fromColSchema){
        var data = this.preProcess(row, fromDbId, fromColId, fromColSchema);
        return this.findOneAndRemove({
            ct_code : data.ct_code,
            scu_code: data.scu_code,
            date    : data.date,
            type    : data.type,
		}).exec().then(function(response) {
			return !!response;
		});
    }
};

module.exports = CalendarSchema;
