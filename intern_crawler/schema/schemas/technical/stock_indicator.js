var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');

var updatedPlugin = require('../../plugins/updated_new');

var StockIndicatorSchema = new Schema({
    symbol_id : { type: String },
    date        : {type : Date},
    // close       : {type : Number},
    // change      : {type : Number},  // 漲跌價
    // change_rate : {type : Number},  // 漲跌幅
    ma5          : { type: Number },
    ma10         : { type: Number },
    ma20         : { type: Number },
    ma60         : { type: Number },
    //bias
    bias5          : { type: Number },
    bias10         : { type: Number },
    bias20         : { type: Number },
    bias60         : { type: Number },
    //psy
    psy12         : { type: Number },
    psy24         : { type: Number },
    //william
    william14       : { type: Number },
    william28       : { type: Number },
    william42       : { type: Number },
    //obv
    obv             : { type: Number },
    //DMI
    '+di'             : { type: Number },
    '-di'             : { type: Number },
    dx             : { type: Number },
    adx             : { type: Number },
    adxr             : { type: Number },
    //sar
    sar             : { type: Number },
    sar_current             : { type: String },
    sar_af             : { type: Number },
    sar_ep             : { type: Number },
    // kd
    k9           : { type: Number },
    d9           : { type: Number },
    // macd
    macd12_26    : { type: Number },
    ema12        : { type: Number },
    ema26        : { type: Number },
    // dif12_26     : { type: Number },
    // rsi
    rsi6         : { type: Number },
    rsi12        : { type: Number },
    up_avg6      : { type: Number },
    up_avg12     : { type: Number },
    down_avg6    : { type: Number },
    down_avg12   : { type: Number }
},{
    versionKey: false,
    collection : 'stock_indicator'
});



StockIndicatorSchema.plugin(updatedPlugin);
StockIndicatorSchema.index({symbol_id: 1, date: -1}, {unique: true});
StockIndicatorSchema.index({date: -1});

StockIndicatorSchema.statics = {
};

module.exports = StockIndicatorSchema;
