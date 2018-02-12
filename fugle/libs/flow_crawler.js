var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var cheerio = require('cheerio');

var type = "D000"
var ID_type = [];
var arr = [];

var crawler = function(type){
    var url = "http://ic.tpex.org.tw/introduce.php?ic=" + type;
    return request(url).then(function (data) {
        var $ = cheerio.load(data);
		//找type和對應的ID
		// $("div.search-item").find("option").each(function(i, e) {
		// 	var obj = {};
		// 	obj.ID = $(this).val();
		// 	obj.type = $(this).text();
		// 	ID_type.push(obj);
		// });
        var t = $("div#sc_industry_D100").text();
        $("div.company-chain-panel").each(function(i, e) {
			arr[i] = $(this).text();
		});

		var company_type = $("div#companyList_D200").eq(1).text();
		console.log(company_type);
		var c_t = ["本國上市公司","外國上市公司","本國上櫃公司","外國上櫃公司","本國興櫃公司","知名外國企業"];
		var c_t_index = [];
		var c_t_str = [];
		for (var i = 0; i < 6; i++) {
			var index = company_type.indexOf(c_t[i]);
			if(index !== -1){
				c_t_index.push(index);
			} 
		}
		for (var k = 0; k < c_t_index.length; k++) {
			if(k !== c_t_index.length - 1){
				var str = company_type.substring(c_t_index[k],c_t_index[k+1]);
				c_t_str.push(str);
			}
			else{
				var str = company_type.substring(c_t_index[k],company_type.indexOf("共"));
				c_t_str.push(str);
			}
		}
		console.log("c_t_str : " + c_t_str);
    });
}

crawler(type);

/*
{
	"半導體" : [
			{
				"type" : "IP設計/IC設計/代工服務",
				"group" : 0,
				"ID" : "DC00",
				"flow" : "上游",
				"stock" : [{
						"subtype" : "",
						"本國上市" : [],
						"外國上市" : [],
						"本國上櫃" : [],
						"外國上櫃" : [],
						"本國興櫃" : [],
						"知名外企" : []
					}
				]
			},
			{
				"type" : "IC設計",
				"group" : 0,
				"ID" : "D100",
				"flow" : "上游", 
				"stock" : [{
						"subtype" : "LED驅動IC",
						"本國上市" : [],
						"外國上市" : [],
						"本國上櫃" : [],
						"外國上櫃" : [],
						"本國興櫃" : [],
						"知名外企" : []
					},
					{
						"subtype" : "光通訊IC",
						"本國上市" : [],
						"外國上市" : [],
						"本國上櫃" : [],
						"外國上櫃" : [],
						"本國興櫃" : [],
						"知名外企" : []
					},
					{
						"subtype" : "光源管理IC",
						"本國上市" : [],
						"外國上市" : [],
						"本國上櫃" : [],
						"外國上櫃" : [],
						"本國興櫃" : [],
						"知名外企" : []
					}
				]
			},
		]
}
*/
