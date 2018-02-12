
// restart crawler
for(i=0;i<mgr_length ; i++){
            var button_name = '#button_crawler_'+i.toString();
            $(button_name).click(function(){
                var index =  this.id.slice('button_crawler_'.length);
                /*
                var board_name = $('#crawler_'+index).find('#board_name').text();
                var limit_type = $('#crawler_'+index).find('#limit_type').text();
                var limit_number = $('#crawler_'+index).find('#limit_number').text();
                */
                var board_name = $('#board_name_'+index).text();
                var limit_type = $('#limit_type_'+index).text();
                var limit_number = $('#limit_number_'+index).text();


                var cmd_string = board_name+' '+limit_type+' '+limit_number;
                //alert(cmd_string);
                if($('#crawler_'+index).find('#current').text().trim() == 'Sleep'){
                    $.ajax({
                         url: '/ajax',
                         type: 'POST',
                         cache: false,
                         data: { cmd_string: cmd_string},
                    });
                    $('#crawler_'+index).find('#current').text('Crawling');
                }
                else{
                    alert('Error: Crawler ' + cmd_string +' is crawling now.');
                }


                clearInterval(refresh_timer);
                refresh_timer = setInterval(function(){
                    if(window.location.pathname == '/'){
                        check_crawling_status();
                    }
                }, 5000);

                });
        }

//delete crawler
for(i=0;i<mgr_length;i++){
    var delete_button_name = '#button_crawler_delete_'+i.toString();
    $(delete_button_name).click(function(){
        var index =  this.id.slice('button_crawler_delete_'.length);
        /*
        var board_name = $('#crawler_'+index).find('#board_name').text();
        var limit_type = $('#crawler_'+index).find('#limit_type').text();
        var limit_number = $('#crawler_'+index).find('#limit_number').text();
        */
        var board_name = $('#board_name_'+index).text();
        var limit_type = $('#limit_type_'+index).text();
        var limit_number = $('#limit_number_'+index).text();

        var cmd_string = board_name + limit_type + limit_number;

        if(confirm('Do you want to delete crawler '+cmd_string+' ?') == true){
            $.ajax({
                 url: '/delete_crawler',
                 type: 'POST',
                 cache: false,
                 data_type: 'json',
                 data: {
                     board_name : board_name,
                     limit_type : limit_type,
                     limit_number : limit_number
                 },
                 success: function(res){
                     alert(res.msg);
                     if(res.code == 0){
                         window.location.reload();
                     }
                 }
            })
        }
    });
}

// add crawler
$('#add_new_crawler').click(function(){
    var board_name = $('#add_board_name').val();
    var limit_type = $('#add_limit_type').val();
    var limit_number = $('#add_limit_number').val();

    $.ajax({
         url: '/add_new_crawler',
         type: 'POST',
         cache: false,
         data: {
             board_name : board_name,
             limit_type : limit_type,
             limit_number : limit_number
         },
         data_type : 'json',
         success: function(res){
             //alert(res.code);
             if (res.code == 1){
                 alert(res.msg);
             }
             else if (res.code == 0) {
                 if(!alert(res.msg)){
                     window.location.reload();
                 }
             }
             else {
                 alert('unknow error');
             }
         }
     });
});


//update crawler
for(i=0;i<mgr_length;i++){
    var board_name_field = '#board_name_'+i.toString();
    var limit_type_field = '#limit_type_'+i.toString();
    var limit_number_field = '#limit_number_'+i.toString();

    //limit_type
    $(limit_type_field).dblclick(function(e){
        e.stopPropagation();
        var index =  this.id.slice('#limit_type'.length);
        var new_id = 'new_limit_type_'+index;
        var current_element = $(this);
        var current_value = $(this).html().trim();
        //alert(current_value);
        current_element.html('<input id="'+ new_id +'" type="text" style="width:50px" placeholder="' + current_value + '" />');
        $('#'+new_id).focus();
        $('#'+new_id).keyup(function(e){
            if (e.keyCode == 13){
                if ($('#'+new_id).val() != 'page' && $('#'+new_id).val() != 'day'){
                    alert('ERROR: limit_type should be "page" '+ 'or'+ '" day"');
                    current_element.html(current_value);
                }
                else if ($('#'+new_id).val() == current_value){
                    alert('ERROR: no changes detected.');
                    current_element.html(current_value);
                }
                else if(confirm('Do you want to update "'+current_value+'" to "'+ $('#'+new_id).val()+'" ?') == true){
                    current_element.html($('#'+new_id).val());
                    $.ajax({
                         url: '/update_crawler',
                         type: 'POST',
                         cache: false,
                         data_type: 'json',
                         data: {
                             board_name : $('#board_name_'+index).text().trim(),
                             limit_type : $('#limit_type_'+index).text().trim(),
                             limit_number : $('#limit_number_'+index).text().trim(),
                             old_limit_type : current_value
                         },
                         success: function(res){
                             alert(res.msg);
                             if(res.code == 0){
                                 window.location.reload();
                             }
                             else if(res.code == 1){
                                 current_element.html(current_value);
                             }
                         }
                    });
                }
                else {
                    current_element.html(current_value);
                }
            }
            else if(e.keyCode == 27){
                current_element.html(current_value);
            }
        });

        $('#'+new_id).click(function(){
            current_element.html(current_value);
        });
        $(document).click(function(){
            current_element.html(current_value);
        });
    });


    //limit_number
    $(limit_number_field).dblclick(function(e){
        e.stopPropagation();
        var index =  this.id.slice('#limit_number'.length);
        var new_id = 'new_limit_number_'+index;
        var current_element = $(this);
        var current_value = $(this).html().trim();
        //alert(current_value);
        current_element.html('<input id="'+ new_id +'" type="text" style="width:50px" placeholder="' + current_value + '" />');
        $('#'+new_id).focus();
        $('#'+new_id).keyup(function(e){
            if (e.keyCode == 13){
                //////
                if (!(parseInt($('#'+new_id).val()) <= 10 && parseInt($('#'+new_id).val()) > 0)){
                    alert('ERROR: limit_number should be an integer, larger than 0 and smaller than 10');
                    current_element.html(current_value);
                }
                //////
                else if ($('#'+new_id).val() == current_value){
                    alert('ERROR: no changes detected.');
                    current_element.html(current_value);
                }
                else if(confirm('Do you want to update "'+current_value+'" to "'+ $('#'+new_id).val()+'" ?') == true){
                    current_element.html($('#'+new_id).val());
                    $.ajax({
                         url: '/update_crawler',
                         type: 'POST',
                         cache: false,
                         data_type: 'json',
                         data: {
                             board_name : $('#board_name_'+index).text().trim(),
                             limit_type : $('#limit_type_'+index).text().trim(),
                             limit_number : $('#limit_number_'+index).text().trim(),
                             old_limit_number : current_value
                         },
                         success: function(res){
                             alert(res.msg);
                             if(res.code == 0){
                                 window.location.reload();
                             }
                             else if(res.code == 1){
                                 current_element.html(current_value);
                             }
                         }
                    });
                }
                else {
                    current_element.html(current_value);
                }
            }
            else if(e.keyCode == 27){
                current_element.html(current_value);
            }
        });

        $('#'+new_id).click(function(){
            current_element.html(current_value);
        });
        $(document).click(function(){
            current_element.html(current_value);
        });
    });

}

//change crawler current status

for(i=0;i<mgr_length;i++){
    var crawler_field = '#crawler_'+i.toString();
    var $current = $(crawler_field).find('#current');

    $current.dblclick(function(e){
        var index = $(this).prev().prev().attr('id').slice('#limit_number'.length);
        var current_string = $('#crawler_'+index).find('#current').text().trim();
        var change_string = (current_string == 'Sleep')? 'Crawling' : 'Sleep';
        if(confirm('Do you want to change crawler current status from '+current_string+' to '+change_string+' ?') == true){
            $.ajax({
                 url: '/change_crawler_current',
                 type: 'POST',
                 cache: false,
                 data_type: 'json',
                 data: {
                     board_name : $('#board_name_'+index).text().trim(),
                     limit_type : $('#limit_type_'+index).text().trim(),
                     limit_number : $('#limit_number_'+index).text().trim(),
                     new_type : change_string
                 },
                 success: function(res){
                     alert(res.msg);
                     if(res.code == 0){
                         window.location.reload();
                     }
                 }
            })
        }

    });
}



//check_crawling_status
function check_crawling_status(){

    for (i=0;i<mgr_length;i++){
        var crawler_field = '#crawler_'+i.toString();
        var board_name_field = '#board_name_'+i.toString();
        var limit_type_field = '#limit_type_'+i.toString();
        var limit_number_field = '#limit_number_'+i.toString();
        if ($(crawler_field).find('#current').text().trim() == 'Crawling'){

            $.ajax({
                 url: '/check_crawler',
                 type: 'POST',
                 cache: false,
                 data_type: 'json',
                 data: {
                     board_name : $(board_name_field).text().trim(),
                     limit_type : $(limit_type_field).text().trim(),
                     limit_number : $(limit_number_field).text().trim(),
                     index : i
                 },
                 success: function(res){
                     if(res.code == 0){
                         //alert(crawler_field + ' DONE ' + res.update +' ' +res.update_time);
                         $('#crawler_'+res.index).find('#current').html('Sleep');
                         $('#crawler_'+res.index).find('#last_update').html(res.update);
                         $('#crawler_'+res.index).find('#last_updatetime').html(res.update_time);
                     }
                 }
            });

        }
    }
}
