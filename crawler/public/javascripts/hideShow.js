$(document).ready(function(){
      $(".click").on("click",(function(){
          $(this).parent().next().find(".toggle").toggle();
          // $(".toggle").toggle();
      }));
});

  
