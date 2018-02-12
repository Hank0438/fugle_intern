var _ = require("lodash");
var day_before = 0;

function setValueTodata(data,value){
    data.rsi6 = value.rsi6;
    data.rsi12 = value.rsi12;
    data.up_avg6 = value.up_avg6;
    data.up_avg12 = value.up_avg12;
    data.down_avg6 = value.down_avg6;
    data.down_avg12 = value.down_avg12;
}

function setFirstValueTodata(data, start_idx, value){

    var up, down;
    var up_average , down_average, result;
    var x = 6;
    var ret = {};

    //console.log(data.slice(0,10));
    for(var i = x-1; i < Math.min(12, data.length) ; i++){
        up = 0;
        down = 0;
        for(var j = i-(x-1) ; j <= i; j++){
            if(data[j].change >= 0){
                up += data[j].change;
            }else{
                down += (-1 * data[j].change);
            }
        }
        up_average = up;
        down_average = down;
        var delimeter = up + down;
        if(delimeter === 0 ) delimeter = 1;
        result = ( up_average / delimeter)* 100;
        //console.log("------------------",up,down, result);
        data[i].rsi6 = result;
        data[i].up_avg6 = up_average;
        data[i].down_avg6 = down_average;

    }
    ret.up_avg6 = up_average;
    ret.down_avg6 = down_average;

    x = 12;
    for(var i = x-1; i< Math.min(12, data.length); i++){
        up = 0;
        down = 0;
        for(var j = i-(x-1) ; j <= i; j++){
            if(data[j].change >= 0){
                up += data[j].change;
            }else{
                down += (-1 * data[j].change);
            }
        }

        up_average = up;
        down_average = down;
        var delimeter = up + down;
        if(delimeter === 0 ) delimeter = 1;
        result = ( up_average / delimeter)* 100;
        data[i].rsi12 = result;
        data[i].up_avg12 = up_average;
        data[i].down_avg12 = down_average;
    }

    ret.up_avg12 = up_average;
    ret.down_avg12 = down_average;


    return { start_idx: 12 ,prev_index : ret };
}


function genInitVal(tech_data_map, symbol_id){
    var prev_index = {};
    if( symbol_id in tech_data_map ){
    }
    return prev_index;
}

function calcIndex(prev_rsi, data){
    data = data[0];
    var up_avg6, down_avg6, up_avg12, down_avg12;
    if(data.change >= 0){
        up_avg6 = (prev_rsi.up_avg6*(6-1) + data.change)/6;
        up_avg12 = (prev_rsi.up_avg12*(12-1) + data.change)/12;

        down_avg6 = (prev_rsi.down_avg6*(6-1))/6;
        down_avg12 = (prev_rsi.down_avg12*(12-1))/12;
    }else{

        up_avg6 = (prev_rsi.up_avg6*(6-1))/6;
        up_avg12 = (prev_rsi.up_avg12*(12-1))/12;

        down_avg6 = (prev_rsi.down_avg6*(6-1) + Math.abs(data.change))/6;
        down_avg12 = (prev_rsi.down_avg12*(12-1) + Math.abs(data.change))/12;
    }

    var delimeter6 = up_avg6 + down_avg6;
    var delimeter12 = up_avg12 + down_avg12;
    return {
        up_avg6,
        up_avg12,
        down_avg6,
        down_avg12,
        rsi6 : (delimeter6 === 0) ? 50 : up_avg6 /delimeter6 * 100,
        rsi12 : (delimeter12 === 0) ? 50 :  up_avg12 /delimeter12 * 100
    };
}

module.exports = {
    day_before,
    setFirstValueTodata,
    setValueTodata,
    genInitVal,
    calcIndex
};
