var fs = require('fs');

//將3個txt檔寫成JSON
var contents = {};

fs.readFile('C:/Users/USER/Desktop/crawler/1.txt',function(err, data){
  if(err){
  	throw err;
  }
  contents.one=data.toString();
  fs.readFile('C:/Users/USER/Desktop/crawler/2.txt',function(err, data){
    if(err){
  	  throw err;
    }
    contents.two=data.toString();
    fs.readFile('C:/Users/USER/Desktop/crawler/3.txt',function(err, data){
      if(err){
  	    throw err;
      }
      contents.three=data.toString();
      console.log(JSON.stringify(contents, null, 4));
      fs.writeFileSync("r_contents.json",JSON.stringify(contents, null, 4));
    });
  });
});



