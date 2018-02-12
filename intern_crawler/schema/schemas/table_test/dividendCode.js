var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

var codeList = {
    'DV001': '期別',
    'DV002': '董事會決議通過股利分派日',
    'DV003': '股東會日期',
    'DV004': '期初未分配盈餘/待彌補虧損(元)',
    'DV005': '本期淨利(淨損)(元)',
    'DV006': '可分配盈餘(元)',
    'DV007': '分配後期末未分配盈餘(元)',
    'DV008': ['股東配發內容-盈餘分配之現金股利(元/股)', 
              '現金股利-股東配發內容-盈餘分配之股東現金股利(元/股)'],
    'DV009': ['股東配發內容-法定盈餘公積、資本公積發放之現金(元/股)', 
              '現金股利-股東配發內容-法定盈餘公積、資本公積發放之現金(元/股)'],
    'DV010': '股東配發內容-股東配發之現金(股利)總金額(元)',
    'DV011': ['股東配發內容-盈餘轉增資配股(元/股)', 
              '股票股利-股東配發內容-盈餘轉增資配股(元/股)',
              '股票股利-股東股利-盈餘配股(元/股)'],
    'DV012': ['股東配發內容-法定盈餘公積、資本公積轉增資配股(元/股)', 
              '股票股利-股東配發內容-法定盈餘公積、資本公積轉增資配股(元/股)',
              '股票股利-股東股利-資本公積配股(元/股)'],
    'DV013': '股東配發內容-股東配股總股數(股)',
    'DV014': '董監酬勞(元)',
    'DV015': ['員工紅利-現金紅利金額(元)', 
              '現金股利-員工紅利總金額(元)'],
    'DV016': '員工紅利-股票紅利金額(元)',
    'DV017': ['員工紅利-股票紅利股數(股)', 
              '股票股利-員工紅利-配股總股數(股)'],
    'DV018': ['員工紅利-股票紅利股數佔盈餘轉增資之比例(%)', 
              '股票股利-員工紅利-配股總股數佔盈餘配股總股數之比例(%)'],
    'DV019': '有無全數分派員工股票紅利而股東未配發股票股利之情事',
    'DV020': '股東會對於員工紅利及董監酬勞之決議情形與原董事會通過擬議內容之差異原因及合理性',
    'DV021': '摘錄公司章程-股利分派部分',
    'DV022': '備註',
    'DV023': '普通股每股面額',
    'DV024': '權利分派基準日',
    'DV025': '股票股利-除權交易日',
    'DV026': '股票股利-員工紅利-配股總金額(元)',
    'DV027': '股票股利-員工紅利-員工紅利配股率',
    'DV028': '現金股利-股東股利(元/股)',              // should equal to DV008 + DV009
    'DV029': '現金股利-除息交易日',
    'DV030': '現金股利-現金股利發放日',
    'DV031': '現金增資總股數(股)',
    'DV032': '現金增資認股比率(%)',
    'DV033': '現金增資認購價(元/股)',
    'DV034': '公告日期',    // 觀測站公告日期 (just for ref.)
    'DV035': '公告時間',    // 觀測站公告時間 (just for ref.)
    'DV036': '詳細資料',
};

var DividendCodeSchema = new Schema({
    code : { type: String },
    fullname: [{ _id: false, type: String }],
},  { collection : 'dividend_code' });

DividendCodeSchema.index({code: 1}, {unique: true});

DividendCodeSchema.statics = {
    getFullname : function(code){
        return this.findOne({code: code}).exec();
    },

    getList : function(){
        return this.find({}, {_id: false}).exec().then(function(list){
            var ret = {};
            _.each(list, function(el, idx){
                ret[el['code']] = el['fullname'];
            });
            return ret;
        });
    },

    initDb : function(){
        var self = this;
        return Promise.each(Object.keys(codeList), function(code){
            return self.update({
                code: code
            }, {
                $set: {
                    fullname: codeList[code]
                }
            }, {upsert: true}).exec();
        });
    }

}

module.exports = DividendCodeSchema;
