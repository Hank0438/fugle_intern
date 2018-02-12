var fs = require('fs');
var waterfall = require('async-waterfall');

//將5個txt檔寫成JSON
var contents = {};
  waterfall([
    function(callback){
      fs.readFile('C:/Users/USER/Desktop/crawler/libs/1.txt',function(err, data){
        if(err){
          throw err;
        }
        contents.one = data.toString();
        callback(null,'1');
        console.log('1 is done.');
      })
    },
    function(a,callback){
      fs.readFile('C:/Users/USER/Desktop/crawler/libs/2.txt',function(err, data){
        if(err){
          throw err;
        }
        contents.two = data.toString();
        callback(null,'2');
        console.log('2 is done.');
      })
    },
    function(b,callback){
      fs.readFile('C:/Users/USER/Desktop/crawler/libs/3.txt',function(err, data){
        if(err){
          throw err;
        }
        contents.three = data.toString();
        callback(null,'3');
        console.log('3 is done.');
        fs.writeFileSync("waterfall_contents.json",JSON.stringify(contents, null, 4));
        console.log("file saved");
      })
    }
  ],
    function (err, result) {
  // result now equals 'done' 
      if (err) { console.log('Something is wrong!'); }
      // fs.writeFileSync("r_contents.json",JSON.stringify(contents));
      return console.log('Done!');
  }
  );

