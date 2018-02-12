var nodejieba = require("nodejieba");
var result = nodejieba.cut("南京市長江大橋");
console.log(result);
//["南京市","長江大橋"]