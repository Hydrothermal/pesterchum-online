function error() {
    $("#error").animate({ opacity: 1 }, 150);

    //Lazy way to detect a mobile screen and blur the input so the mobile keyboard stops covering up the error
    if(window.innerHeight <= 700) {
        $("#nick-input").blur();
    }
}

$(function() {
    $("#nick-input").focus();

    $("#nick").submit(function() {
        var nick = $("#nick-input").val();

        if(!/^[a-z0-9\\[\]\^_\-|`]{1,30}$/i.test(nick)) {
            error();
            return false;
        }
    });

    if(document.URL.indexOf("?err") > -1) {
        error();
    }
});