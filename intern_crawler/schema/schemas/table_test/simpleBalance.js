/**
 * Created by bistin on 2014/8/26.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var Promise = require('bluebird');
var _ = require('underscore');

var sheetSchema = new Schema({
    symbol_id : String,
    year      : Number,
    season    : Number,
    period    : String,         // 會計base時間: 季度, 半年度
    cate      : [String],       // category: 合併, 個別
    data      : [{
        _id:false,
        account :  String,      // 欄位
        value : Number
    }],
    ifres : Boolean
},  { collection : 'simpleBalance' });

sheetSchema.index({symbol_id: 1, year: -1, season: -1});
sheetSchema.index({symbol_id: 1, 'data.account':1});

function genEps(val){
    val = val.sort(function(a,b){return a.season- b.season})
    for(var i = 0;i<val.length;i++){
        if(i===0){
            val[i].eps = val[i].accueps
        }else{
            val[i].eps = +(val[i].accueps-val[i-1].accueps).toFixed(2);
        }
    }
    return val;
}

function calcRate(now,past){
    return   +((now-past)/past*100).toFixed(2);
}

sheetSchema.statics = {
    get : function(symbol_id){
        return this.find({symbol_id: symbol_id},{_id:0}).exec();
    },
    updateData : function(sheetData){
        return this.update({
            symbol_id : sheetData.symbol_id,
            year : sheetData.year,
            season : sheetData.season
        },{ $set: sheetData },{upsert:true}).exec();
    },
    fixPeriod : function(sheetData, period){
        return this.update({
            symbol_id : sheetData.symbol_id,
            year : sheetData.year,
            season : sheetData.season
        },{ $set: 
            { period: period } 
        }).exec();
    },
    /* Get latest N records */
    getLatestN: function(symbol_id, N){
        return this.find({symbol_id: symbol_id}, {_id: 0}).sort({year: -1, season: -1}).limit(N).lean().exec();
    },
    /* Get latest N records before date 
     * 1/1 => last year season 4, last year season 3, ...
     * 4/1 => season 1, last year season 4, ...
     * ... 
     */    
    getLatestNBeforeDate: function(symbol_id, momentDate, N){
        var year = momentDate.year(),
            month = momentDate.month() + 1,
            temp = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3],
            season = temp[month - 1];
        return this.find(
            {symbol_id: symbol_id,
             $or: [
                {year: year, season: {$lte: season}},
                {year: {$lte: year - 1}},
             ]
            }, {_id: 0}
        ).sort({year: -1, season: -1}).limit(N).lean().exec();
    },
    getLatestBeforeDate: function(symbol_id, momentDate){
        return this.getLatestNBeforeDate(symbol_id, momentDate, 1);
    },
    getBps : function(symbol_id){
        return Promise.cast(this.find(
            {symbol_id:symbol_id, 'data.account' : '每股淨值(元)'},
            {_id:0, symbol_id:1, year:1, season:1 ,'data.$':1}
        ).lean().exec()).then(function(data){
            return data.map(function(xx){
                return { season:xx.season, year:xx.year, eps: xx.data[0]['value']};
            })
        })
    },
    getEps : function(symbol_id){
        return Promise.cast(this.find(
            {symbol_id:symbol_id},
            {_id:0,  types:0,cate:0 ,'ifres':0}
        ).lean().exec()).then(function(data){
            var ret = [];
            var data = _.chain(data).map(function(row){
                var ret = _.pick(row,['year','season']);
                ret.accueps = row.data[row.data.length-1].value;
                return ret;
            }).groupBy(function(val){return val.year})
            .map(genEps)
            .value();
            data = _.flatten(data);
            var dataIdxed = _.indexBy(data, function(row){return row.year+'_'+row.season;});
            data = data.map(function(row){
                var yoykey = (row.year-1)+'_'+row.season;
                if(row.season == 1){
                    var qoqkey = (row.year-1)+'_4';
                }else{
                    var qoqkey = row.year+'_'+(row.season-1);
                }

                if(yoykey in dataIdxed){
                    row.yoy = calcRate(row.eps,dataIdxed[yoykey].eps);
                    row.accuyoy = calcRate(row.accueps,dataIdxed[yoykey].accueps);
                }
                if(qoqkey in dataIdxed){
                    row.qoq = calcRate(row.eps,dataIdxed[qoqkey].eps);
                }
                return row;
            }).filter(function(val){
                return ('yoy' in val);
            });
            return data
//            return data;
        })
    },
    genTable : function(symbol_id){
        return Promise.cast(this.get(symbol_id)).bind({}).map(mapToNew).then(function(sheets){
            //newest data as total order;
            var resultHeader = [null].concat(sheets.map(function(sheet){
                return sheet.year+'Q'+sheet.season;
            }));
            var resultTable = _.pluck(sheets[0].data,'account').map(function(field){
                return [field];
            });
            sheets.forEach(function(sheet, sheetIdx){
                var dataMapping = _.indexBy( sheet.data, 'account');
                resultTable.forEach(function(val, idx){
                    if(dataMapping[val[0]]){
                        val[sheetIdx+1] = dataMapping[val[0]].value;
                    }
                });
            });
            return {
                head: resultHeader,
                content : resultTable
            };
        })
    }
}

function mapToNew(sheet){
    if(sheet.ifres === false){
        var mappedResult = [];
        sheet['data'].forEach(function(row){
            if(row['account'] in mapping){
                if(_.isArray(mapping[row['account']])){
                    mapping[row['account']].forEach(function(val){
                        mappedResult.push({account:val, value:row.value});
                    })
                }else{
                    row['account'] = mapping[row['account']];
                    mappedResult.push(row);
                }
            }
        });
        // adding same field
        var res = _.chain(mappedResult)
            .groupBy( function(row){ return row['account']; })
            .map(function(value,key){
                return {account: key ,value : _.reduce(value, function(total,row){  return total+row.value } , 0)}
            }).value();
        sheet['data'] = res;
    }else{
        //filter out last field
        sheet['data'] = sheet['data'].filter(function(row){
            return row['account'].indexOf('每股淨值＝') < 0;
        })
    }
    return sheet;
}

module.exports = sheetSchema;

var mapping =
{
    '營業收入'	:     '營業收入',
    '營業成本'	:	  '營業成本',
    '所得稅費用（利益）' : '所得稅費用（利益）',
    '非常損益'   :  '非常損益',
    '會計原則變動累積影響數' : '會計原則變動累積影響數',
        '營業毛利(毛損)'				:'營業毛利（毛損）淨額',
    '營業費用'					:'營業費用',
    '營業淨利(淨損)'				:'營業利益（損失）',
    '營業外收入及利益'				:'營業外收入及支出',
    '繼續營業單位稅前淨利(淨損)'	:'稅前淨利（淨損）',
    '繼續營業單位淨利(淨損)'		:'繼續營業單位本期淨利（淨損）',
    '合併總損益'					:'本期淨利（淨損）',
    '合併淨損益'					:'淨利（淨損）歸屬於母公司業主',
    '共同控制下前手權益'			:'淨利（淨損）歸屬於共同控制下前手權益',
    '少數股權損益'				:'淨利（淨損）歸屬於非控制權益',
    '基本每股盈餘'				:'基本每股盈餘（元）'
};


//
//var mapping =  {
//    '流動資產'		:	'流動資產',
//    '基金與投資'		:	'非流動資產',
//    '固定資產'		:	'非流動資產',
//    '無形資產'		:	'非流動資產',
//    '其他資產'		:	'非流動資產',
//    '資產總計'		:	'資產總額',
//    '流動負債'		:	'流動負債',
//    '長期負債'		:	'非流動負債',
//    '各項準備'		:	'非流動負債',
//    '其他負債'		:	'非流動負債',
//    '負債總計'		:	'負債總額',
//    '股本'		:	['股本','歸屬於母公司業主之權益合計'],
//    '資本公積'		:	['資本公積','歸屬於母公司業主之權益合計'],
//    '保留盈餘'		:	['保留盈餘','歸屬於母公司業主之權益合計'],
//    '股東權益其他調整項目合計'		:	['其他權益','歸屬於母公司業主之權益合計'],
//    '庫藏股票(自98年第4季起併入「其他項目」表達)'		:	['庫藏股票','歸屬於母公司業主之權益合計'],
//    '歸屬於母公司業主之權益合計':	'歸屬於母公司業主之權益合計',
//    '少數股東權益':	'非控制權益',
//    '股東權益總計'	:  '權益總額',
//    '母公司暨子公司所持有之母公司庫藏股股數(單位:股)' : '母公司暨子公司所持有之母公司庫藏股股數（單位：股）',
//    '預收股款(股東權益項下)之約當發行股數(單位:股)':'預收股款（權益項下）之約當發行股數（單位：股）',
//    '少數股權' : '非控制權益',
//    '少數股東股權' : '非控制權益',
//    '每股淨值' : '每股淨值(元)'
//};
//
//
