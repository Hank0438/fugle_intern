/**
 * Created by bistin on 2014/8/11.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');
var toposort = require('../../helper/toposort_helper');
var _ = require('underscore');

var sheetSchema = new Schema({
    symbol_id : String,
    time      : String,
    year      : Number,
    season    : Number,
    types      : [String],
    cate      : [String],
    data      : [{  _id:false ,
                    account :  String,
                    value : Number ,
                    level : Number
                }],
    moneyunit  : String,
    ifres     : Boolean
});

sheetSchema.index({symbol_id: 1, year: -1, season:-1});

sheetSchema.statics = {
    get : function(symbol_id){
        return this.find({symbol_id: symbol_id},{_id:0}).exec();
    },
    updateData : function(sheetData){
        return this.update({
            symbol_id : sheetData.symbol_id,
            year : sheetData.year,
            season : sheetData.season,
            types : sheetData.types
        },{ $set:sheetData },{upsert:true}).exec();
    },
    getEps : function(symbol_id){
        return Promise.cast(this.find(
            {symbol_id:symbol_id, 'data.account' : '基本每股盈餘合計',type:'season'},
            {_id:0, symbol_id:1, year:1, season:1 ,'data.$':1}
        ).exec()).then(function(data){
            return data.map(function(xx){
                return { season:xx.season, year:xx.year, eps: xx.data[0]['value']};
            })
        })
    },

    genTable : function(symbol_id){
        return Promise.cast(this.get(symbol_id)).bind({}).then(function(data){
            this.sheets  = data;
            var fieldsArr = data.map(function(sheet){
                return  sheet.data.map(function(row,idx){
                    return row.account+row.level;
                });
            });
            return toposort.sortArrays(fieldsArr)
        }).then(function(idxInfo){
            var sheets = this.sheets;
            var resultHeader = [null].concat(sheets.map(function(sheet){
                return sheet.year+'Q'+sheet.season;
            }))
            var resultTable = idxInfo.fields.map(function(field){
                return [field];
            });
            idxInfo.idxs.forEach(function(rowIdxs,sheetIdx){
                return rowIdxs.forEach(function(resultIdx,rowIdx){
                    resultTable[resultIdx][sheetIdx+1] = sheets[sheetIdx].data[rowIdx].value;
                })
            });
            return {
                head: resultHeader,
                content : resultTable
            };
        })
    }
}

module.exports = sheetSchema;
