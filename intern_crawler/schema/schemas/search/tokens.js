/**
 * Created by bistin on 2015/01/08.
 */
var mongoose = require('mongoose');
var Promise = require('bluebird');
var _ = require('lodash');

// var dataUtils = require('../../../lib/ct_data_utils');
var config = require('../../../config');

var MAX_CONCURRENT_WRITES = config.chinatimes.MAX_CONCURRENT_WRITES;
var Schema = mongoose.Schema;

var Tokens = new Schema({
    terms : [{ type: String }],
    mapTo : [{ type: Schema.Types.Mixed }],
    score : { type: Number, default: 1000 },
}, { collection : 'tokens'});

Tokens.index({'terms': 1});
Tokens.index({'mapTo': 1}, {unique: true});

var scores = {
    'tw.tse'           : 9000,
    'tw.concept'       : 8000,
    'tw.etf'           : 7000,
    'tw.index'         : 7000,
    'tw.otc'           : 6000,
    'tw.emg'           : 5000,
    'forex'            : 4900,
    'world.index'      : 4800,
    // cards (4500)
    'tw.gisa'          : 4000,
    'tw.public'        : 3000,
    'tw.non-public'    : 2000,
    'commodity.group'  : 1700,
    'commodity'        : 1600,
    'us.nasdaq'        : 1500,
    'us.nyse'          : 1500,
    'us.amex'          : 1500,
};

Tokens.statics = {

    bulkUpdateData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        return Promise.map(rows, function(row) {
            return self.updateData(row, fromDbId, fromColId, fromColSchema);
        }, {concurrency: MAX_CONCURRENT_WRITES});
    },

    bulkRemoveData : function(rows, fromDbId, fromColId, fromColSchema) {
        var self = this;
        return Promise.map(rows, function(row) {
            return self.removeData(row, fromDbId, fromColId, fromColSchema);
        }, {concurrency: MAX_CONCURRENT_WRITES});
    },

    // commodity symbol info is imported from ct's database,
    // check fromDbId to determine where the data comes from.
    // ex: update_company.js crawler will call: SymbolInfo.updateData(finalData, 'tw.stock');
    updateData : function(row, fromDbId, fromColId, fromColSchema) {
        if (fromColId === 'CMDSPC') {
            return this.updateDataCMDSPC(row, fromDbId, fromColId, fromColSchema);
        } else {
            return this.updateDataFUGLE(row);
        }
    },

    updateDataCMDSPC : function(row, fromDbId, fromColId, fromColSchema) {
        var self = this;
        var symbolId = 'CM.' + row.CMD_CODE + '.' + row.SPC_CODE;
        var names = [row.NM_SPC60.replace(/ /g, '/').replace(/\/+/g, '/')];
        var market = 'commodity';
        names = names.map(function(name) { return name.toUpperCase(); });
        return this.update({'mapTo.symbol_id': symbolId}, {
            $addToSet: {'terms': { $each: names } }
        }).exec().then(function(response) {
            if(response.n > 0) return;
            var terms = names;
            var score = scores[market] ? scores[market] : 1000;
            return self.create({
                terms: terms,
                mapTo: [{symbol_id: symbolId}],
                score: score
            });
        });
    },

    updateDataFUGLE: function(row) {
    	var self = this;
        var symbolId = row.symbolId;
        var terms = row.terms;
        var market = row.market;
        terms = terms.map(function(name) { return name.toUpperCase(); });
        return Promise.resolve(
            this.findOne({
                'mapTo.symbol_id': symbolId
            }, {
                _id: 0,
                terms: 1
            }).lean().exec()
        ).then(function(obj) {
            if (obj) {
                // prepend new terms so they'll be matched first
                terms = terms.filter(function(term) {
                    return obj.terms.indexOf(term) === -1;
                });
                terms = terms.concat(obj.terms);
                return self.update({
                    'mapTo.symbol_id': symbolId
                }, {
                    $set: {'terms': terms }
                }).exec();
            } else {
                var score = scores[market] ? scores[market] : 1000;
                return self.create({
                    terms: terms,
                    mapTo: [{symbol_id: symbolId}],
                    score: score
                });
            }
        });
    },

    removeData : function(row) {
    },

};

module.exports = Tokens;
