var Promise = require('bluebird');
var request = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));

fs.readFileAsync('C:/Users/USER/Desktop/Fugle/sth_fun.json').then(function(information){
    var input = JSON.parse(information);
    var links = [];
    var nodes = [];
    var car_node = {
        id : "car",
        group : 6
    };
    nodes.push(car_node);
    for (var key in input) {
        // skip loop if the property is from prototype
        if (!input.hasOwnProperty(key)) continue;
        var car_link = {
            source : "car",
            target : key,
            value : 10
        }
        links.push(car_link);
        var type_node = {
            id : key,
            group : 1
        }
        nodes.push(type_node);
        //type node
        var obj = input[key];
        for (var prop in obj) {
            // skip loop if the property is from prototype
            if(!obj.hasOwnProperty(prop)) continue;
            //link
            var node = {
                id : obj[prop].company_name,
                group : 5
            }; 
            var link = {
                source : key,
                target : obj[prop].company_name,
                value : 10
            };
            nodes.push(node);
            links.push(link);
        };
    };
    var output = {
        nodes : nodes,
        links : links
    };
    console.log(output);
    fs.writeFileSync("sample.json", JSON.stringify(output, null , 4));
});
