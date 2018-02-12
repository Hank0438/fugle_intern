var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));

//將3個txt檔寫成JSON
var contents = {};

fs.readFileAsync('C:/Users/USER/Desktop/crawler/libs/1.txt')
.then(function(data){
  console.log("1");
  contents.one=data.toString();
  return fs.readFileAsync('C:/Users/USER/Desktop/crawler/libs/2.txt');
})
.then(function(data){
  console.log("2");
  contents.two=data.toString();
  return fs.readFileAsync('C:/Users/USER/Desktop/crawler/libs/3.txt');
})
.then(function(data){
  console.log("3");
  contents.three=data.toString();
  console.log(JSON.stringify(contents, null, 4)) 
  return fs.writeFileAsync("promise_contents.json",JSON.stringify(contents, null, 4));
})
  
 
