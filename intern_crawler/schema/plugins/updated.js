var mongoose = require('mongoose');

// * THIS PLUGIN IS DEPRECATED 
//   USE UPDATED_NEW INSTEAD

// * updated_at should be updated *ONLY* when new doc != old doc. 
//   do NOT call update/save before find & check old doc with new doc.
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
		this.updated_at = date;
		next();
	});

	// query middleware
	schema.pre('findOneAndUpdate', function(next) {
		var date = new Date();
		this.update({}, { $set: { updated_at: date } });
		next();
	});
	schema.pre('update', function(next) {
		var date = new Date();
		this.update({}, { 
			$setOnInsert: {
				created_at: date
			},
			$set: { 
				updated_at: date
	 		} 
	 	});
		next();
	});
  
};

