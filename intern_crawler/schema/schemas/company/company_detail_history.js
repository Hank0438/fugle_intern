/**
 * Created by bistin on 2014/9/16.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('underscore');

var detailSchema = new Schema({
    symbol_id : { type: String },
    date : { type: String },
    data : { type: Schema.Types.Mixed },
},  { collection : 'detail_history' })

detailSchema.index({symbol_id: 1, date: -1}, {unique: true});
detailSchema.index({date: -1});

detailSchema.statics = {
    get : function(symbol_id){
        return this.find({symbol_id: symbol_id},{_id:0,symbol_id:0}).exec().then(function(data){
            return data;
            return _.pick(data[0].data,[
                '董事長',
                '發言人',
                '主要經營業務',
                '公司名稱',
                '公司網址',
                '英文全名',
                '代理發言人'])
        });
    },
}

module.exports = detailSchema;
