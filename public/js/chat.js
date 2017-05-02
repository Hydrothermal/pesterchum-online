var chans = {},
    selectedchannel = "network",
    channelcliplength, socket, nick, mention;

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
        $("#nick-input").val(nick);
    });

    socket.on("redirect", function() {
        location.replace("/");
    });

    socket.on("disconnect", function() {
        location.assign("/");
    });

    socket.on("message", function(channel, message) {
        receiveMessage("message", channel, message);
    });

    socket.on("action", function(from, channel, message) {
        receiveMessage("action", channel, message);
    });

    socket.on("pm", function(tab, initials, message) {
        var tab;

        addMessage(tab, "message", (initials ? (initials + ": ") : "") + message);
    });

    socket.on("channel", function(channel) {
        if(!chans[channel]) {
            initializeChannel(channel);
        }

        selectedchannel = channel;
        updateChannels();
    });

    socket.on("remchannel", function(channel) {
        delete chans[channel];
        updateChannels();
    });

    socket.on("names", function(channel, names) {
        chans[channel].names = names;
        updateNames();
    });

    socket.on("broadcast", function(message) {
        message = "System broadcast: " + message;
        
        addMessage(selectedchannel, "system", "<b>" + message + "</b>");
        alert(message);
    });

    socket.on("notice", function(message) {
        addMessage(selectedchannel, "system", message);
    });

    socket.on("mention", function(channel) {
        mention.pause();
        mention.currentTime = 0;
        mention.play();

        if(selectedchannel !== channel) {
            $(".channel[data-channel=\\" + channel + "]").addClass("mentioned")
        }
    });

    socket.on("joined", function(nick, channel) {
        chans[channel].names.push(nick);
        updateNames(channel);
    });

    socket.on("parted", function(nick, channel) {
        var names = chans[channel].names;
        
        names.splice(names.indexOf(nick), 1);
        updateNames(channel);
    });

    socket.on("list", function(list) {
        $("#server-channels-wrapper").show().height($("#settings").height() - 70);
        $("#server-channels").html(list);
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

    if(!checkChannel(selectedchannel, true)) {
        selectedchannel = $(".channel").last().click().data("channel");
    }
}

function updateHistory() {
    $("#history").html(chans[selectedchannel].html);
}

function updateNames() {
    $("#names").html(sortNames(chans[selectedchannel].names).map(function(name) {
        return "<div class='name'>" + name + "</div>";
    }));
}

function initializeChannel(channel, user) {
    chans[channel] = {
        html: "",
        names: [],
        user: user || false
    };
}

function selectChannel() {
    $(".selected").removeClass("selected");
    $(this).addClass("selected").removeClass("mentioned");

    selectedchannel = $(this).data("channel");
    $("#input").attr("placeholder", selectedchannel).focus();
    
    if(chans[selectedchannel].user) {
        $("#names, #show-names").addClass("hidden");
        $("#history").addClass("full");
    } else {
        updateNames();
        $("#names, #show-names").removeClass("hidden");
        $("#history").removeClass("full");
    }

    updateHistory();
}

function addMessage(channel, type, message) {
    //is_scrolled must be set before appending the new message
    var history = $("#history")[0],
        is_scrolled = history.scrollTop === history.scrollHeight - history.offsetHeight;

    channel = channel || selectedchannel;

    //This generally shouldn't happen
    if(!chans[channel]) {
        initializeChannel(channel);        
        selectedchannel = channel;
        updateChannels();
    }

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
    } else if(selectedchannel !== "network") {
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
    initializeChannel("network", true)
    initializeSocket();

    channelcliplength = Math.max(6, Math.floor(window.innerWidth / 80));
    mention = $("#sound-mention")[0];
    
    $("#input").focus();

    $("#input-form").submit(submitMessage);

    $("#chum").click(function() {
        var $this = $(this);
        
        $("#settings").toggleClass("show");
        $this.addClass("spin");

        setTimeout(function() {
            $this.removeClass("spin");
        }, 200);
    });

    $("#show-names").click(function() {
        if(this.className === "pull") {
            $("#names").addClass("shown");
            $("#history").addClass("bumped");
            $("#show-names").removeClass("pull").addClass("push");
        } else {
            $("#names").removeClass("shown");
            $("#history").removeClass("bumped");
            $("#show-names").removeClass("push").addClass("pull");
        }
    });

    $("#list-memos").click(function() {
        socket.emit("list");
    });
    
    $(document)
        .on("click", ".channel", selectChannel)
        .on("click", ".name", function() {
            var name = this.innerHTML.replace(/[~&@%+]/g, "");

            if(!chans[name]) {
                initializeChannel(name, true);
            }
            
            selectedchannel = name;
            updateChannels();
        })
        .on("click", "#server-channels .channel-name", function() {
            parseCommand("join " + this.innerHTML);
        });

    addMessage("network", "system", "Welcome to PCO! Use <b>/join</b> to join a memo or <b>/help</b> for more commands.");
    addMessage("network", "system", "There is now a settings panel with a memo list. Click the chum in the top right to open it.");
    updateChannels();
});