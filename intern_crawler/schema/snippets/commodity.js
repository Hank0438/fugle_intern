// 商品行情 collection : ct_symbol_group / ct_symbol / ct_tokens(edited)
// 1. import commodity_raw into symbol_group
// 2. run this script

​var groupId = 0;
db.getCollection('ct_symbol_group').aggregate([
   { $group: { 
      _id: '$tempIdx',
      order: { $first: '$row' },
      terms: { $first: '$terms' }
   } },
   { $sort: {order: 1} }
]).result.forEach(function(tDoc){
   var contains = [];
   var docs = db.getCollection('ct_symbol_group').find({tempIdx: tDoc._id});
   docs.forEach(function(doc){
      contains.push(doc.symbol_id);
      var terms = tDoc.terms.map(function(term){
          return term + '(' + doc.detail + ')';
      });
      db.getCollection('ct_tokens').insert({
         type: 1,
         mapTo: [{symbol_id: doc.symbol_id}],
         terms: terms
      });
      db.getCollection('ct_symbol').update({
          symbol_id: doc.symbol_id
      }, {$set: {name: terms[0]}});
   });

   var groupIdString = 'CTGRP-' + ('00000'+groupId).slice(-5);
   db.getCollection('ct_symbol_group').insert({symbol_id: groupIdString, contains: contains});
   db.getCollection('ct_symbol').insert({
      symbol_id: groupIdString,
      category: 'TWNSBGRP',
      name: tDoc._id,
      aliases: [],
      market: 'TWNSBGRP',
      industry: 'TWNSBGRP',
      on_date: null,
      off_date: null,
      available_cards: []
   });
   db.getCollection('ct_tokens').insert({
      type: 1,
      mapTo: [{symbol_id: groupIdString}],
      terms: tDoc.terms
   });

   groupId++;
});

// then remove initial docs
//db.getCollection('ct_symbol_group').remove({contains:{$exists: false}})
//
// remove special groups' members from ct_tokens
//var specialGroups = [
//   'CTGRP-00116',
//   'CTGRP-00117',
//   'CTGRP-00112',
//   'CTGRP-00113',
//   'CTGRP-00111',
//   'CTGRP-00119',
//   'CTGRP-00114',
//   'CTGRP-00110',
//   'CTGRP-00115',
//   'CTGRP-00118',
//   'CTGRP-00120',
//];
//db.getCollection('ct_symbol_group').find({symbol_id: {$in: specialGroups}}).forEach(function(doc){
//    var symbolIds = doc.contains;
//    db.getCollection('ct_tokens').remove({'mapTo.symbol_id': {$in: symbolIds, $ne: 'CM-B070202300-0006'}});
//});
//
// if need to reset (re-import), clean up by:
//db.getCollection('ct_symbol_group').remove({})
//db.getCollection('ct_symbol').remove({market:'TWNSBGRP'})
//db.getCollection('ct_tokens').remove({type:1, 'mapTo.0.symbol_id':{$exists:true}})(edited)