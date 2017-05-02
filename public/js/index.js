var nicks;

function error() {
    $("#error").animate({ opacity: 1 }, 150);

    //Lazy way to detect a mobile screen and blur the input so the mobile keyboard stops covering up the error
    if(window.innerHeight <= 700) {
        $("#nick-input").blur();
    }
}

function getNicks() {
    nicks = localStorage.getItem("nicks");

    if(!nicks) {
        localStorage.setItem("nicks", "");
        nicks = [];
    } else {
        nicks = nicks.split(";");
    }
}

function loadNicks() {
    for(var i = 0; i < nicks.length; i++) {
        $("#nick-menu").append("<div class='nick'>" + nicks[i] + "</div>")
    }
}

function addNick(nick) {
    var i = nicks.indexOf(nick);

    if(i === -1) {
        nicks.unshift(nick);
    } else {
        nicks.unshift(nicks.splice(i, 1)[0]);
    }
    
    localStorage.setItem("nicks", nicks.join(";"));
}

$(function() {
    loadNicks();

    $("#nick-input").focus();

    $("#nick").submit(function() {
        var nick = $("#nick-input").val();

        if(!/^[a-z0-9\\[\]\^_\-|`]{1,30}$/i.test(nick)) {
            error();
            return false;
        }

        addNick(nick);
    });

    $("#nick-menuicon").click(function() {
        $(this).toggleClass("is-active");
        $("#nick-input").toggleClass("open");
        $("#nick-menu").slideToggle(150);
    });

    $("#nick-menu .nick").click(function() {
        $("#nick-input").val(this.innerHTML);
        $("#nick-menuicon").click();
    });

    if(nicks.length === 0) {
        $("#nick-menuicon").hide();
    }

    if(document.URL.indexOf("?err") > -1) {
        error();
    }
});

getNicks();