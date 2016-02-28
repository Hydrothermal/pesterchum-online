var chans = [],
    selectedchannel, channelcliplength, socket;

function initializeSocket() {
    socket = io();
    registerSocket();

    socket.on("registered", function(nick) {
        $("#nick").html(nick);
    });

    socket.on("redirect", function() {
        location.replace("/");
    });

    socket.on("disconnect", function() {
        location.assign("/");
    });

    socket.on("message", function(from, channel, message) {
        receiveMessage("message", channel, message);
    });

    socket.on("action", function(from, channel, message) {
        receiveMessage("action", channel, message);
    });

    socket.on("pm", function(from, message) {
        addMessage("message", "&raquo;" + message);
    });

    socket.on("channel", function(channel) {
        if(chans.indexOf(channel) === -1) {
            chans.push(channel);
        }

        selectedchannel = channel;
        updateChannels();
    });
}

function updateChannels() {
    $("#channel-count").html(chans.length);
    $("#channel-list").html("");

    chans.forEach(function(channel) {
        $("#channel-list").append("<span class='channel' data-channel='" + channel + "'>" + clipString(channel, channelcliplength) + "</span>");

        if(channel === selectedchannel) {
            $(".channel").last().click();
        }
    });

    if(chans.length > 1) {
        $("#channel-plural").show();
    } else {
        $("#channel-plural").hide();
    }
}

function selectChannel() {
    //TODO: Clean up
    $(".selected").removeClass("selected");
    $(this).addClass("selected");
    selectedchannel = $(this).data("channel");
    $("#input").attr("placeholder", $(this).data("channel")).focus();
}

function addMessage(type, message) {
    var history = $("#history")[0],
        is_scrolled = history.scrollTop === history.scrollHeight - history.offsetHeight;

    $("#history").append("<div class='message message-" + type + "'>" + message + "</div>");

    if(is_scrolled) {
        history.scrollTop = history.scrollHeight;
    }
}

function receiveMessage(type, channel, message) {
    addMessage(type, "<b class='message-channel'>" + clipString(channel, channelcliplength) + "</b> " + message);
}

function submitMessage() {
    var message = $("#input").val(),
        type = "message";

    $("#input").val("");

    if(message.substr(0, 4) === "/me ") {
        type = "action";
    } else if(message[0] === "/") {
        type = "command";
    }

    if(type === "command") {
        parseCommand(message.substr(1));
    } else {
        socket.emit(type, selectedchannel, message);
    }

    return false;
}

$(function() {
    initializeSocket();

    channelcliplength = Math.max(6, Math.floor(window.innerWidth / 80));
    
    $("#input").focus();

    $("#input-form").submit(submitMessage);

    $("#chum").click(function() {
        var $this = $(this);
        
        $this.addClass("spin");

        setTimeout(function() {
            $this.removeClass("spin");
        }, 200);
    });
    
    $(document).on("click", ".channel", selectChannel);
});