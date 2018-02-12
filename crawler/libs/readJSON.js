var fs = require('fs'),
    request = require('request'),
    cheerio = require('cheerio');

var contents = {};
var keyword1 = "台股";
var keyword2 = "外資";
var keyword3 = "賠";
//找有關鍵字的內文
//找有關鍵字的推文
//找同一個人在同一篇文章的推文
//找同一個人發文的標題

    /*{
        "author": "wickwolf (呆狼)",
        "title": "[閒聊] 2016/07/14 盤後閒聊",
        "publishedDate": "Thu Jul 14 14:00:00 2016",
        "board": "Stock",
        "likeCount": 0,
        "content": ""
        "comment": [{exress : "", name: "", words: "", time : ""},
                    {exress : "", name: "", words: "", time : ""},
                    {exress : "", name: "", words: "", time : ""}]
    }*/
var c ={};
var arr = [];//[{name: "",times: ""},{name: "",times: ""},{name: "",times: ""}]
fs.readFile('C:/Users/USER/Desktop/crawler/keyword_test.json',function(err, data){
  if(err){
    throw err;
  }
  console.log(data.toString());
  c = JSON.parse(data.toString());//將字串轉成Object
  var comment = c.comment;
  
  for(var i=0; i<=c.comment.length-1; i++){//將所有人名統計發文次數
    var count=0;
    for(var j=0; j<=c.comment.length-1; j++){
      if(comment[i].name === comment[j].name){
        count++;
      }
      if(i-1>j && comment[i].name === arr[j].name){// 將前面重複的刪除
        arr.splice(j, 1);
      }
    };
    result = {
	    name : comment[i].name,
      count : count
	  }; 
    arr.push(result);
  };
  arr.sort(function(a,b) {// 按照count次數排列
    return b.count - a.count;
  });


  console.log("arr: ")
  console.log(arr);
  // console.log(comment[1].express);
  console.log("Read Successfully");

//Bistin's Way
// var r={};
// var r2=[];
// for(var i=0; i<=c.comment.length-1; i++){
//   if(comment[i].name in r){
//     r[comment[i].name]+=1
//   }else{
//     r[comment[i].name] =1
//   }  
// };
// for(var key in r){    
//     r2.push({
//       'name' : key,
//       'count' : r[key]
//     });      
// };
// r2.sort(function (a, b) {
//       return b.count - a.count;
//     }); 
// console.log(r);
// console.log(r2);

});