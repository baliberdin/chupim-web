$(document).ready(function(){

  $('#menu-stage-save').click(function(){
    showSaveModal();
    return false;
  });

  $(document).bind('keydown', function(e) {
    if(e.ctrlKey && (e.which == 83)) {
      e.preventDefault();
      return false;
    }
  });

  $('#fallback-selector').change(function(){
    let value = $(this).val();
    if(value == 1){
      $('#fallback-fn-collapse').collapse('show');
    }else{
      $('#fallback-fn-collapse').collapse('hide');
    }
  });

  $('#fallback-selector').change();

  let form = document.getElementById('stage-save-form');
  form.addEventListener('submit', function(event) {
      if (!validateNewStage() || form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
      }
      //form.classList.add('was-validated');
    }, false);
});

function showSaveModal(){
  //$('#stage-save-modal').modal({});

  new bootstrap.Modal('#stage-save-modal', {}).show();

  $('#stage-save-form input[name=source]').val(editor.getValue());

  // circuit breaker
  let cbEnabled = $('input[name="cb-enabled"]').prop('checked');
  $('#stage-save-form input[name="circuitBreaker.enabled"]').val(cbEnabled);

  let cbTimeout = $('input[name="cb-timeout"]').val() || 1000;
  $('#stage-save-form input[name="circuitBreaker.timeout"]').val(cbTimeout);

  let cbAction = $('select[name="cb-fallback-action"]').val() || 0;
  $('#stage-save-form input[name="circuitBreaker.action"]').val(cbAction);

  let cbFunction = $('select[name="cb-fallback-fn"]').val();
  $('#stage-save-form input[name="circuitBreaker.fn"]').val(cbFunction);
}

var editor = ace.edit("stage-source");
editor.setTheme("ace/theme/dracula");
editor.session.setMode("ace/mode/javascript");
editor.setFontSize(20);
editor.session.setTabSize(2);

editor.commands.addCommand({
  name: 'saveStage',
  bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
  exec: function(editor) {
      showSaveModal();
  },
  readOnly: true
});

function validateNewStage(){
  let source = $('#stage-save-form input[name=stageSource]').val();

  // circuit breaker
  let cbEnabled = $('#stage-save-form input[name="circuitBreaker.enabled"]').val();
  let cbTimeout = $('#stage-save-form input[name="circuitBreaker.timeout"]').val();
  let cbAction = $('#stage-save-form input[name="circuitBreaker.action"]').val();
  let cbFn = $('#stage-save-form input[name="circuitBreaker.fn"]').val();
  let prefix = $('#stage-save-form input[name="prefix"]').val();
  let name = $('#stage-save-form input[name="name"]').val();
  
  // console.log(prefix);
  // console.log(name);
  // console.log(cbEnabled);
  // console.log(cbTimeout);
  // console.log(cbFn);
  // console.log(cbAction);

  let isValid = true;

  if(name == undefined || name.trim().length == 0){
    $(document.forms["stage-save-form"]["name"]).addClass('is-invalid');
    isValid = false;
  }else{
    $(document.forms["stage-save-form"]["name"]).removeClass('is-invalid');
    $(document.forms["stage-save-form"]["name"]).addClass('is-valid');
  }

  if(prefix == undefined || prefix.trim().length == 0){
    $(document.forms["stage-save-form"]["prefix"]).addClass('is-invalid');
    isValid = false;
  }else{
    $(document.forms["stage-save-form"]["prefix"]).removeClass('is-invalid');
    $(document.forms["stage-save-form"]["prefix"]).addClass('is-valid');
  }

  if(cbEnabled == 'true'){
    if(isNaN(cbTimeout)){
      $(document.forms["stage-save-form"]["circuitBreaker.timeout"]).removeClass('is-valid');
      $(document.forms["stage-save-form"]["circuitBreaker.timeout"]).addClass('is-invalid');
      isValid = false;
    }else{
      $(document.forms["stage-save-form"]["circuitBreaker.timeout"]).removeClass('is-invalid');
      $(document.forms["stage-save-form"]["circuitBreaker.timeout"]).addClass('is-valid');
    }

    if(cbAction == 1 && (cbFn == undefined || cbFn.trim().length == 0)){
      $(document.forms["stage-save-form"]["circuitBreaker.fn"]).removeClass('is-valid');
      $(document.forms["stage-save-form"]["circuitBreaker.fn"]).addClass('is-invalid');
      isValid = false;
    }else{
      $(document.forms["stage-save-form"]["circuitBreaker.fn"]).removeClass('is-invalid');
      $(document.forms["stage-save-form"]["circuitBreaker.fn"]).addClass('is-valid');
    }
  }else{
    $(document.forms["stage-save-form"]["circuitBreaker.timeout"]).removeClass('is-invalid');
    $(document.forms["stage-save-form"]["circuitBreaker.timeout"]).addClass('is-valid');
    $(document.forms["stage-save-form"]["circuitBreaker.fn"]).removeClass('is-invalid');
    $(document.forms["stage-save-form"]["circuitBreaker.fn"]).addClass('is-valid');
  }

  return isValid;
}