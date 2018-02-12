function calcMaIndex(data, technical, symbol_id){
    var ma_windows = [5, 10, 20, 60]
    var ma = {}
    ma_windows.forEach(function(windows){ ma[windows] = 0.0 })

    data.forEach(function(row, index){
        ma_windows.forEach(function(windows){
            ma[windows] += row.close/windows;
            if (index >= windows){
                ma[windows] -= data[index-windows].close/windows;
            }
            if(index >= windows - 1){
                var field_name = 'ma' + windows
                row[field_name] = ma[windows]
            }
        })
    })
    console.log(data)
}