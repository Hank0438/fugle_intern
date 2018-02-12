var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
mongoose.connect( 'mongodb://git.fugle.tw:27017/company_test2');
// var insertComp = process.argv[2];
var companySchema = mongoose.Schema({
    company_name : String,
    symbol_id : {type: String, index: true}
},{ _id : false });

var Schema = mongoose.Schema({
    company_name : String,
    symbol_id :  {type: String, index: true},
    supplier : [companySchema],
    competitor : [companySchema],
    client : [companySchema],
    investing : [companySchema],
    invested : [companySchema],
    align : [companySchema],
    updated_at : Date,
    created_at : Date 
});
var companyCrawler = mongoose.model('Schema', Schema, "company_demo");
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

var producer = function(){
    var container = {
        nodes : [],
        links : []
    };
    var arr = [];

    companyCrawler.find({}).exec().then(function(data){
        //生成所有的node(有重複) 
        for (var k = 0; k < data.length; k++) {
            var node = {}
            node.id = data[k].company_name;
            node.unique = 1;
            arr.push(node);
        }
        for (var i = 0; i < data.length; i++) {
            //生成link by node的competitor
            var type = (data[i].competitor);
            for (var j = 0; j < type.length; j++) {
                var node_temp = {};
                node_temp.id = type[j].company_name;
                for (var n = 0; n < arr.length; n++) {
                    // console.log("arr.length : "+arr.length + " ____ "+"("+i+","+j+")")
                    if(arr[n].id !== node_temp.id && type[j].symbol_id !== ""){
                        // console.log(arr[n].id +" / "+ node_temp.id)
                        node_temp.unique = 1;
                    }
                    else{
                        node_temp.unique = 0;
                        break;
                    }
                }
                arr.push(node_temp);
                if(type[j].symbol_id !== ""){
                    var link = {};
                    link.source = data[i].company_name;
                    link.target = type[j].company_name;
                    link.value = 5;
                    (container.links).push(link);
                }
            }
        };
        var a = arr.filter(filterArr);
        // console.log(a);
        for (var h = 0; h < a.length; h++) {
            var node = {};
            node.id = a[h].id;
            //pattern allocation
            // if((a[h].id).slice(-1) === "證" || (a[h].id).slice(-1) === "票" || (a[h].id).slice(-1) === "券"){//證券
            //     node.group = 1;
            // }
            // else if((a[h].id).slice(-1) === "保" || (a[h].id).slice(-1) === "產" || (a[h].id).slice(-1) === "壽" || (a[h].id).slice(-1) === "險"){//保險
            //     node.group = 2;
            // }
            // else if((a[h].id).slice(-1) === "銀"){//銀行
            //     node.group = 3;
            // }
            // else if((a[h].id).slice(-1) === "金"){//金控
            //     node.group = 4;
            // }
            // else{
            //     node.group = 5;
            // }
            node.group = 5;
            (container.nodes).push(node);
        }
        return;
    }).then(function(){
        // console.log(arr);
        fs.writeFileSync("sample.json", JSON.stringify(container, null , 4));
    }).then(function(){
        console.log("Everything is done.");
        mongoose.disconnect();
    });
    return;
};

var filterArr = function(value){
    return value.unique === 1;
}

db.once('open', function(callback){
    console.log("Connected to DB");
    producer();
});

 