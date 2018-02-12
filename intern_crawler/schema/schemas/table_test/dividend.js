var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var DividendSchema = new Schema({
    symbol_id : { type: String },
    year: { type: Number },     // 股利年度 (by 西元)
    date: { type: Date },       // 會議日期 / 公告日期
    source: { type: String },   // 資料來源: 股東會確認/董事會通過/除權息公告
    data: [{
        _id: false,
        code: { type: String },
        value: { type: String } 
    }] 
},  { collection : 'dividend' });

DividendSchema.plugin(updatedPlugin);
DividendSchema.index({symbol_id: 1, year: -1, source: 1}, {unique: true});
DividendSchema.index({year: 1, source: 1});

DividendSchema.statics = {

    getValueByCode: function(dataArray, code){
        return _.find(dataArray, function(data){ return data.code === code; });
    },
    getSumByCodes: function(dataArray, codes){
        var sum = 0,
            self = this;
        _.each(codes, function(code){
            var value = self.getValueByCode(dataArray, code);
            value = isNaN(+value)? 0 : (+value);
            sum += value;
        });
        return sum;
    },

    get: function(symbol_id){
        return this.find({symbol_id: symbol_id}).exec();
    },
    getBasicByYearAndSource: function(year, source){
        return this.find({year: year, source: source}, {_id: 0, data: 0}).exec();
    },

    /*
     * 最新現金股利(每股配發之盈餘分配之現金股利 + 法定盈餘公積、資本公積發放之現金 + 盈餘轉增資股票股利)
     * DV008 + DV009 + DV011 (董事會/股東會) OR 
     * DV011 + DV028 (除權息公告)
     */
    getLatestCashDividend: function(symbol_id){
        return this.getLatestCashDividendBeforeDate(symbol_id, moment());
    },
    getLatestCashDividendBeforeDate: function(symbol_id, momentDate){
        var self = this;
        return this.find({symbol_id: symbol_id, date: {$lt: momentDate.toDate()}}).sort({year: -1}).lean().exec().then(function(dataList){
            if (!dataList.length){ return 0; }
            var year = dataList[0].year;    // latest year
            var yearDataList = _.filter(dataList, function(data){ return data.year === year; });
            var bulletinData = _.find(yearDataList, function(data){ return data.source === '除權息公告'; });
            var assignData1 = _.find(yearDataList, function(data){ return data.source === '董事會通過'; });
            var assignData2 = _.find(yearDataList, function(data){ return data.source === '股東會確認'; });
            if (bulletinData){
                return self.getSumByCodes(bulletinData.data, ['DV011', 'DV028']);
            }else if (assignData1){
                return self.getSumByCodes(assignData1.data, ['DV008', 'DV009', 'DV011']);
            }else if (assignData2){
                return self.getSumByCodes(assignData2.data, ['DV008', 'DV009', 'DV011']);
            }else{
                console.log('impossible');
            }
        });
    },

    updateData: function(data){
        var codeValue = [];
        var self = this;
        var match = {
            symbol_id: data.symbol_id,
            year: data.year,
            source: data.source,
        };
        var temp = _.omit(data, 'symbol_id', 'year', 'source', 'date');
        _.each(temp, function(val, key){
            codeValue.push({
                code: key,
                value: val
            })
        });
        var setValue = {
            data: codeValue
        };
        if (data.date) { setValue.date = data.date; }

        return Promise.resolve(
            this.update(match, {
                $set: setValue
            }, { upsert: true }).exec()
        ).then(function(response) {
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
    }

}

module.exports = DividendSchema;
