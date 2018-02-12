var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Promise = require('bluebird');
var _ = require('lodash');

var CardSpec = new Schema({
    card_spec_id: { type: String },
    card_name: { type: String },
    card_category: { type: String },
    card_template: { type: String },
    content_spec_ids: [{ type: String }],
    formatter_ids: [{ type: String }],
    disabled: { type: Boolean }
}, { collection: 'card_spec' });

CardSpec.index({ card_spec_id: 1 }, { unique: true });

CardSpec.statics = {
    get: function() {
        return Promise.resolve(this.find({}, { _id: 0 }).lean().exec());
    },

    getById: function(id) {
        return Promise.resolve(this.findOne({ card_spec_id: id }, { _id: 0 }).lean().exec());
    },

    getByContentSpecId: function(contentSpecId) {
        return Promise.resolve(this.find({ content_spec_ids: contentSpecId }, { _id: 0 }).lean().exec());
    },

    getAllCardSpecIds: function() {
        return Promise.resolve(this.find({}, { _id: 0, card_spec_id: 1 }).lean().exec()).then(function(result) {
            return _.map(result, 'card_spec_id');
        });
    }
};

module.exports = CardSpec;
