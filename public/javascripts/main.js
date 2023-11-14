$(document).ready(function () {
  $(".action-remove").click(function () {
    $("#alert-modal .modal-body").html($(this).attr("data-alert"));
    $("#alert-modal .modal-footer a").attr("href", $(this).attr("data-link"));
    $("#alert-modal").modal();
    return false;
  });

  $('input[type="checkbox"]').change((event) => {
    let enabled = $(event.currentTarget).prop("checked");
    let pipeline = $(event.currentTarget).attr("data-pipeline");

    if ($(event.currentTarget).prop("data-failed") == true) {
      $(event.currentTarget).prop("data-failed", false);
    } else {
      var request = new XMLHttpRequest();
      request.open("get", `/pipeline/update/${pipeline}?enabled=${enabled}`);
      request.onloadend = (e) => {
        if (request.status != 200) {
          $(event.currentTarget).prop("data-failed", true);
          $(event.currentTarget).prop("checked", !enabled);
          $(event.currentTarget).click();
          showError(
            `Error on change pipeline status!<br>${request.statusText} [${request.status}]`,
            "#"
          );
        }
      };
      request.send();
    }
  });
});

function showError(text, link) {
  $("#error-modal .modal-body").html(text);
  $("#error-modal .modal-footer a").attr("href", link);
  $("#error-modal").modal();
  return false;
}
