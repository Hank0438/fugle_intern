/**
 * Created by bistin on 2014/9/16.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('lodash');

var updatedPlugin = require('../../plugins/updated_new');

var detailSchema = new Schema({
    symbol_id : { type: String },
    data : { type: Schema.Types.Mixed },
},  { collection : 'detail' })

detailSchema.plugin(updatedPlugin);
detailSchema.index({symbol_id: 1}, {unique: true});

detailSchema.statics = {
    get : function(symbolId) {
        return this.findOne({symbol_id: symbolId}, {_id:0, symbol_id:0}).lean().exec().then(function(data) {
            if (_.isEmpty(data)){ return data; }
            var detail = data.data;
            var ret = {
                companyName : detail['公司名稱'],
                marketType : detail['市場類別'],

                symbolId : detail['股票代號'],
                englishFullName : detail['英文全名'],
                endlishShortName : detail['英文簡稱'],

                industry : detail['產業類別'],
                tel : detail['總機'],
                address : detail['地址'],
                chairman : detail['董事長'],
                managers : detail['總經理'],
                speaker : detail['發言人'],
                speakerTitle : detail['發言人職稱'],
                speakerPhone : detail['發言人電話'],
                altSpeaker : detail['代理發言人'],
                operations : detail['主要經營業務'],

                foundDate : detail['公司成立日期'],
                taxId : detail['營利事業統一編號'],
                ipoDate : detail['公開發行日期'],
                listDate : detail['上市日期'],
                otcDate : detail['上櫃日期'],
                emDate : detail['興櫃日期'],

                capital : detail['實收資本額'] ? detail['實收資本額'] : detail['實收資本額(元)'],
                release : detail['已發行普通股數或TDR原股發行股數'],
                special : detail['特別股'],
                price : detail['普通股每股面額'] ? detail['普通股每股面額'] : detail['股價'],

                transferAgency : detail['股票過戶機構'],
                agencyTel : detail['電話'] ? detail['電話'] : detail['過戶機構電話'],
                agencyAddress : detail['過戶地址'] ? detail['過戶地址'] : detail['過戶機構地址'],
                accountingAgency : detail['簽證會計師事務所'],

                companyUrl : detail['公司網址']
            };
            return ret;
        });
    },

    getCapital : function(symbolId) {
        return Promise.resolve(this.findOne({symbol_id: symbolId}, {_id:0, symbol_id:0}).lean().exec()).then(function(data) {
            if (_.isEmpty(data)) { return {}; }
            var detail = data.data;
            var capital = detail['實收資本額'] ? detail['實收資本額'] : detail['實收資本額(元)'];
            capital = capital.replace(/\D+/g, '');
            return {
                capital : capital
            };
        });
    },

    updateData: function(symbolId, detail) {
        var self = this;
        var match = {
            symbol_id: symbolId
        };
        return Promise.resolve(
            this.update(match, {
                $set: {
                    data: detail
                }
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

};

module.exports = detailSchema;
