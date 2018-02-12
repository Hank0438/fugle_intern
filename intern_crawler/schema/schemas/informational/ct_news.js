var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
var dataUtils = require('../../../lib/ct_data_utils');
var updatedPlugin = require('../../plugins/updated_new');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var ImageObj = new Schema({
  url: String,
  desc: String
},{
  _id: false
});

var NewsSchema = new Schema({
	id: { type: String },	             // need a id to prevent from duplicated insert ( website news can use url hash )
	timestamp: { type: Date },
	source: { type: String },
    type: { type: String},               // 中時即時新聞分類
	url: { type: String },
	title: { type: String },
    subtitle: { type: String },          // subtitle...lol
	content: { type: String },
    images: [ImageObj],
    videos: [ImageObj],
	symbol_ids: [{ type: String }],
    symbol_cards: [{ type: String }],    // cardSpecIds, ex: FCRD000001 (only for symbols, commodity only has one page)
    commodity_ids: [{ type: String }],
},  {
    collection : 'ct_news',
});

NewsSchema.plugin(updatedPlugin);
NewsSchema.index({id: 1}, {unique: true});
NewsSchema.index({timestamp: -1});
NewsSchema.index({symbol_ids: 1});

NewsSchema.statics = {
    getLastNDay : function(n) {
    	var startTimestamp = moment().startOf('day').add(-n, 'days').toDate();
    	return this.find({timestamp: {$gte: startTimestamp}})
    		.sort({timestamp: -1, id: -1})
    		.exec();
    },

    bulkUpdateData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var symbolIds = [];
        return Promise.map(rows, function(row) {
            return self.updateData(row, fromDbId, fromColId, fromColSchema).then(function(updated) {
                if (updated) { 
                    var tmp = row.all_stock_id ? row.all_stock_id.split(" ") : [];
                    tmp = _.filter(tmp, function(x) {
                        return x !== 'null';
                    });
                    symbolIds = symbolIds.concat(tmp);
                }
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
                if (updated) { 
                    var tmp = row.all_stock_id ? row.all_stock_id.split(" ") : [];
                    tmp = _.filter(tmp, function(x) {
                        return x !== 'null';
                    });
                    symbolIds = symbolIds.concat(tmp);
                }
            });
        }, {concurrency: MAX_CONCURRENT_WRITES}).then(function() {
            return _.uniq(symbolIds);
        });
    },

    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var symbolIds = row.all_stock_id ? row.all_stock_id.split(" ") : [];
            symbolIds = _.filter(symbolIds, function(symbolId) {
                return symbolId !== 'null';
            });
    	var data = {
    		id: 'ct' + moment(row.datetime).format('YYYYMMDD') + row.seq_no,
    		timestamp: row.datetime,
            source: row.source,
            type: row.news_type ? row.news_type : '',
            url: row.url ? row.url : '',
    		title: row.title,
            subtitle: row.subtitle ? row.subtitle : '',
    		content: row.text,
            images: row.images ? row.images : [],
            videos: row.videos ? row.videos : [],
    		symbol_ids: symbolIds,
            symbol_cards: row.symbol_cards ? row.symbol_cards : [],
            commodity_ids: row.commodity_ids ? row.commodity_ids : [],
    	};
        var match = {
			id: data.id
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
    }
};

module.exports = NewsSchema;
