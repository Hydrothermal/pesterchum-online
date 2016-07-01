var chans = {
        network: {
            html: ""
        }
    },
    selectedchannel = "network",
    channelcliplength, socket, nick;

function initializeSocket() {
    socket = io();
    registerSocket();

    socket.on("lag", function(lag) {
        var color;

        if(lag < 100) {
            color = "#0c0";
        } else if(lag < 250) {
            color = "#6a0";
        } else if(lag < 500) {
            color = "#d90";
        } else if(lag < 1000) {
            color = "#f70";
        } else if(lag < 5000) {
            color = "#e00"
        } else {
            color = "#666";
        }

        $("#lag-indicator").css("background-color", color).attr("title", "Lag: " + lag + "ms");
    });

    socket.on("nick", function(_nick) {
        nick = _nick;
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

    socket.on("pm", function(from, to, message) {
        var tab;

        if(from === nick) {
            tab = to;
        } else {
            tab = from;
        }

        if(chans[tab]) {
            addMessage(tab, "message", from + ": " + message);
        } else {
            addMessage(null, "message", from + " &raquo; " + message);
        }
    });

    socket.on("channel", function(channel) {
        if(!chans[channel]) {
            chans[channel] = {
                html: ""
            };
        }

        selectedchannel = channel;
        updateChannels();
    });

    socket.on("remchannel", function(channel) {
        delete chans[channel];
        updateChannels();
    });

    socket.on("names", function(channel, names) {
        addMessage(channel, "system", "Users on " + channel + ": " + names.join(", ") + ".");
    });

    socket.on("broadcast", function(message) {
        message = "System broadcast: " + message;
        
        addMessage(selectedchannel, "system", "<b>" + message + "</b>");
        alert(message);
    });

    socket.on("notice", function(message) {
        addMessage(selectedchannel, "system", message);
    });
}

function updateChannels() {
    var channel_count = 0;

    $("#channel-list").html("");

    for(var chan in chans) {
        $("#channel-list").append("<span class='channel' data-channel='" + chan + "'>" + clipString(chan, channelcliplength) + "</span>");

        if(chan === selectedchannel) {
            $(".channel").last().click();
        }

        channel_count++;
    }

    $("#channel-count").html(channel_count);

    if(channel_count > 1) {
        $("#channel-plural").show();
    } else {
        $("#channel-plural").hide();
    }

    if(!checkChannel(selectedchannel, true)) {
        selectedchannel = $(".channel").last().click().data("channel");
    }
}

function updateHistory() {
    $("#history").html(chans[selectedchannel].html);
}

function selectChannel() {
    //TODO: Clean up
    $(".selected").removeClass("selected");
    $(this).addClass("selected");
    selectedchannel = $(this).data("channel");
    $("#input").attr("placeholder", $(this).data("channel")).focus();
    updateHistory();
}

function addMessage(channel, type, message) {
    //is_scrolled must be set before appending the new message
    var history = $("#history")[0],
        is_scrolled = history.scrollTop === history.scrollHeight - history.offsetHeight;

    channel = channel || selectedchannel;

    chans[channel].html += "<div class='message message-" + type + "'>" + message + "</div>";
    updateHistory();

    if(is_scrolled) {
        history.scrollTop = history.scrollHeight;
    }
}

function receiveMessage(type, channel, message) {
    addMessage(channel, type, message);
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

function checkChannel(channel, suppressfail) {
    for(var chan in chans) {
        if(chan.toLowerCase() === channel.toLowerCase()) {
            return true;
        }
    }

    if(!suppressfail) {
        addMessage(selectedchannel, "system", "Channel '" + channel + "' does not exist.");
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

    addMessage("network", "system", "Welcome to PCO! Use <b>/join</b> to join a memo or <b>/help</b> for more commands.");
    addMessage("network", "system", "Whois is now supported! Don't forget to check <b>/help</b> for new commands.");
    updateChannels();
});