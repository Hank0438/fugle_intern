function calcTrial(order, priceData) {
   let { len, every, day, volume, tolerance } = order;
   const startDate = moment().add(-1*len,'M').toDate();
   priceData = priceData.filter( d => new Date(d.date) >= startDate );

   let result = [];
   let candidate = priceData[priceData.length -1];
   let currentMonth = new Date().getMonth();
   for(var i = priceData.length-1; i >= 0; i--) {
       let tmpDate = new Date(priceData[i].date);
       if(tmpDate.getDate() === day ){
           result.unshift(Object.assign({},priceData[i],{
               month : tmpDate.getMonth()
           }));
       } else if(tmpDate.getDate() < day){
           if( (result.length === 0 && tmpDate.getMonth() !== currentMonth) ||
               (result.length > 0 && tmpDate.getMonth() !==  result[0].month )
             ){
               result.unshift(Object.assign({},candidate,{
                   month : tmpDate.getMonth()
               }));
           }
       }
       candidate = priceData[i];
   }
   result = result
       .filter((d,i)=> i % every === 0 );
       //.filter( d=> Number(d.change_rate) <= tolerance );

   return result.map(row => {
       return {
           date : row.date,
           price : row.close,
           volume : volume,
           total_price : row.close * 1000 * volume
       }
   })
}


function calcHistoryProfit(order, priceData) {
   console.log("=== profit ===");
   let targetIdx = 0;
   let currentVolume = 0;
   let currentInvest = 0;
   priceData.map((row, idx)=> {
       let price = Number(row.close);
       if(row.date === order[targetIdx].date) {
           targetIdx += 1;
           currentVolume += 1;
           currentInvest += price;
           if(targetIdx >= order.length){
               targetIdx = order.length - 1;
           }
       }
       //console.log(currentBuy)
       let rate = Math.round((currentVolume * price - currentInvest)/currentInvest*10000)/100;
       console.log(rate);
   });
   console.log("=== profit ===");
}