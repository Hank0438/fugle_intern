var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Promise = require('bluebird');
var _ = require('lodash');

/*
 * 用 generators[] 可以讓某一個 content_spec_id 擁有多個不同 model 的資料
 * 但也可以在 card_spec 設定某個 card_spec_id 有多個 content_spec_id 可達到相同結果
 */
var Generator = new Schema({
    model: String,
    find_params: [String],
    find_function: String,
},{
    _id: false
});

var CardContent = new Schema({
    content_spec_id: String,
    spec_name: String,
    generators: [Generator],
    checked_at: Date,
}, { collection : 'content_spec'});

CardContent.index({'content_spec_id': 1}, {unique: true});

CardContent.statics = {

    get: function() {
        return this.find({}, {_id: 0}).exec();
    },

    getById: function(id) {
        return this.findOne({content_spec_id: id}, {_id: 0}).exec();        
    },

    getByIds: function(ids) {
        return this.find({content_spec_id: {$in: ids}}, {_id: 0}).exec();        
    },

    updateData: function(ids) {
        var time = new Date();
        return Promise.resolve(
            this.update({content_spec_id: {$in: ids}}, {
                $set: {
                    checked_at: time
                }
            }, {multi: true}).exec()
        );
    }

};

module.exports = CardContent;
