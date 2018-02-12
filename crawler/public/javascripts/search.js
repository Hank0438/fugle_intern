//test
$( "#searchForm" ).submit(function( event ) {

  event.preventDefault();
  var $form = $( this ),
    searchTitle = $form.find( "input[name='s_title']" ).val(),
    searchContent = $form.find( "input[name='s_content']" ).val(),
    searchWords = $form.find( "input[name='s_words']" ).val(),
    searchSymbol = $form.find( "input[name='s_symbol']" ).val()
  var arr = [];
  if (searchTitle.length > 0){
    arr.push("title="+searchTitle);
  }
  if (searchContent.length > 0){
    arr.push("content="+searchContent);
  }
  if (searchWords.length > 0){
    arr.push("words="+searchWords);
  }
  if (searchSymbol.length > 0){
    arr.push("symbol="+searchSymbol);
  }
  var searchString = "";
  for (var i = 0; i < arr.length; i++) {
    searchString += arr[i];
    if(i !== arr.length-1){
        searchString += "&";
    }
  }
  if(searchString === ""){
    window.location.replace("/pttTable?page=0");
    return;
  }
  window.location.replace( "/pttTable?page=0&" + searchString);
});
