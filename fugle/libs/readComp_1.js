var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
mongoose.connect( 'mongodb://localhost:27017/car');
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

var readOneComp = function(insertComp,insertName){
    var con = [];
    // fs.readFileAsync('C:/Users/USER/Desktop/Fugle/test2.html').then(function(data){
    return request("https://djinfo.cathaysec.com.tw/Z/ZC/ZC0/ZC00/ZC00.DJHTM?A="+insertComp,{encoding: null}).then(function (big5_body) {
        console.log("company crawler is starting..."+insertComp);
        var utf8_body = iconv.decode(new Buffer(big5_body),'Big5');
        //   console.log(big5_body);
        var $ = cheerio.load(utf8_body);
        for (var k = 0; k < 6; k++) {
            var objArr = [];//用來放六種類別其中之一抓到的公司名稱
            for (var i = 1; i < 100; i++) {      
                var text = $("td.t3t1").eq(k).find("div.t3t1").eq(i-1).text();
                if(text.indexOf("GenLink2stk")!==-1){//抓一個一個的小script
                    var num = text.substring(text.indexOf("GenLink2stk")+15,text.indexOf(",")-1);
                    var subtext = num + text.substring(text.indexOf(",")+2,text.indexOf(")")-1);
                    var symbol_id = "";
                    var regex = /[0-9]{4,6}/gi;
                    var test = subtext.match(regex);
                    if(test!==null){
                        symbol_id = test[0];
                        subtext = subtext.slice(test[0].length);
                    }
                    var subObj = {
                        company_name : subtext,
                        symbol_id : symbol_id
                    };
                    // console.log(text);
                    // console.log("first part : "+subtext);
                    objArr.push(subObj);
                }
                else{//抓第二部分的大script
                    var subtext = $("td.t3t1").eq(k).find("div.t3t1").eq(i-1).text();
                    var arr = subtext.match(/[^\r\n]+/g);
                    // console.log("second part : "+subtext);
                    // console.log("arr : "+arr);
                    if(arr !== null){
                        for (var j = 0; j < arr.length; j++) {
                            subtext = arr[j].slice(1);
                            var symbol_id = "";
                            var regex = /[0-9]{4,6}/gi;
                            var test = subtext.match(regex);
                            if(test!==null){
                                symbol_id = test[0];
                                subtext = subtext.slice(test[0].length);
                            }
                            var subObj = {
                                company_name : subtext,
                                symbol_id : symbol_id
                            };
                            objArr.push(subObj);
                        }
                    }
                    //檢查是否有重複的公司被寫入objArr
                    for (var n = 0; n < objArr.length; n++) {
                        for (var h = 0; h < objArr.length; h++) {
                            if(n < h && objArr[n].company_name===objArr[h].company_name){
                                console.log("delete : "+objArr[h].company_name);
                                objArr.splice(h,1);
                            };  
                        }
                    }
                    console.log(objArr);
                    break;  
                }   
            }
            con.push(objArr);   
        }
    return con;
    }).then(function(con){
        var result = new companyCrawler({
            company_name : insertName,
            symbol_id : insertComp,
            supplier : con[0],
            competitor : con[1],
            client : con[2],
            investing : con[3],
            invested : con[4],
            align : con[5],
            updated_at : new Date(),
            created_at : new Date() 
        });
        result.save(function(err){
            if ( err ) throw err;
        });
        return;
    }).catch(function (err) {
        console.log("err : "+insertComp);
        mongoose.disconnect();
        return;
    });
};

var companyFilter = function(){
    fs.readFileAsync('C:/Users/USER/Desktop/Fugle/sth_fun.json').then(function(information){
        var input = JSON.parse(information);
        var inputArr = [];
        for (var key in input) {
            // skip loop if the property is from prototype
            if (!input.hasOwnProperty(key)) continue;
            var obj = input[key];
            for (var prop in obj) {
                // skip loop if the property is from prototype
                if(!obj.hasOwnProperty(prop)) continue;
                inputArr.push(obj[prop]);
                console.log(prop + " = " + obj[prop]);
            };
        };
        return Promise.each(, function(company_basic){
            return Promise.delay(500).then(function(){
                var insertComp = company_basic.symbol_id;
                var insertName = company_basic.company_name;
                // console.log("==============="+company_id+"===============");
                return readOneComp(insertComp,insertName);
            });
        }).then(function(){
            mongoose.disconnect();
        });
    });
    return;
};

db.once('open', function(callback){
    console.log("Connected to DB");
    // readOneComp(process.argv[2]);
    companyFilter()
});
