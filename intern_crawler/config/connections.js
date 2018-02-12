var globSync = require('glob').sync;
var path = require('path');
var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');

var config = require('./index');

mongoose.Promise = Promise;

module.exports = function(connectTo, includeDbs) {

    var db;
    if (!connectTo || connectTo === 'fugle') {
        db = config.db;
    } else if (connectTo === 'chinatimes') {
        // do not try to connect
        if (!config.chinatimes.db.enabled) {
            return { models: [] };
        }
        db = config.chinatimes.db;
    }
    var auth = (db.user && db.password) ? (db.user + ':' + db.password + '@') : '';
    var dbConn = 'mongodb://' + auth + db.url;
    var connections = {};
    var models = {};

    // connect to all dbs and retrieve all models
    globSync('../schema/schemas/**/*.js', { cwd: __dirname }).forEach(function(filename) {
        var tmp = filename.split('/');
        var dbString = tmp[tmp.length - 2];
        var schemaString = tmp[tmp.length - 1].replace(/\.js$/, '');
        if (includeDbs && includeDbs.indexOf(dbString) === -1) {
            return;
        }
        if (schemaString === 'symbol_price') {
            // special case: aggregate model functions
            models[schemaString] = require(filename);
        } else if (connections[dbString]) {
            models[schemaString] = connections[dbString].model(schemaString, require(filename));
        } else {
            connections[dbString] = mongoose.createConnection(dbConn + '/' + dbString, _.cloneDeep(db.options));
            models[schemaString] = connections[dbString].model(schemaString, require(filename));
        }
    });

    return {
        models: models
    };
};
