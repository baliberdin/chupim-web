$(document).ready(function(){
  $('#logkeylist').change(function(a,b,c){
    console.log($(a.currentTarget).val());
    let key = $(a.currentTarget).val();
    window.location= `/errors?key=${key}`;
  });  
});