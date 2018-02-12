var mongoose = require('mongoose');

//mongoose.connect('mongodb://git.fugle.tw:27017/fugle-tags');
//mongoose.connect('mongodb://localhost:27017/fugle-tags-new');


var config =  {
    replset: {
        rs_name: 'fugle',
        auto_reconnect: true,
        poolSize: 10,
        socketOptions: {
            keepAlive: 1
        }
    },
    server: {
        auto_reconnect: true,
        socketOptions: {
            keepAlive: 1
        },
        poolSize: 2
    },
    auth: {
        authSource: 'admin' // default auth db
    }
};

// mongoose.connect('mongodb://', config);
mongoose.connect('mongodb://localhost:27017/company');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Database Connected.");
});

var tag_schema = mongoose.Schema({
    date: Date,
    type: String,
    tag_value: mongoose.Schema.Types.Mixed,
    data_value: mongoose.Schema.Types.Mixed
},{
    _id: false
});

var fugle_tags_schema = mongoose.Schema({
    symbol_id: String,
    tags: [tag_schema],
    date: Date
});

tag_schema.index({date: 1, type: 1});
fugle_tags_schema.index({symbol_id: 1, date: 1},{ unique: true });

//fugle_tags_schema.index({  symbol_id: 1, date: 1, "tags.type" : 1 }, { unique: true });

//User.index({ first: 1, last: -1 }, { unique: true })

var fugle_tags = mongoose.model('tag', fugle_tags_schema, 'tag');
module.exports = {fugle_tags};
