var mongoose = require('mongoose');

// leave updated_at to be dealt in each schema
// * updated_at should be updated *ONLY* when new doc != old doc. and we can't acheive that here.
module.exports = exports = function updatedAtPlugin(schema, options) {

    schema.add({ 
        created_at: { type: Date },
        updated_at: { type: Date },
    });

    // document middleware  
    schema.pre('save', function(next) {
        var date = new Date();
        if (!this.created_at) {
            this.created_at = date;
        }
        if (!this.updated_at) {
            this.updated_at = date;
        }
        next();
    });

    // query middleware
    schema.pre('update', function(next) {
        var date = new Date();
        this.update({}, { 
            $setOnInsert: {
                created_at: date
            }
        });
        next();
    });
  
};

