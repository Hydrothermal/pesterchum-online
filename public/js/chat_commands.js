var commands = [];

commands.push({
    uses: ["help"],
    usage: "/help",
    help: "Displays this message.",
    args: 0,
    fn: function(args) {
        addMessage("system", "<hr>");
        
        commands.forEach(function(command) {
            var aliases =
                command.uses.length > 1 ?
                " (Aliases: " + command.uses.slice(1).map(function(command) {
                    return "<b>/" + command + "</b>";
                }).join(", ") + ".)" :
                "";

            addMessage("system", "<b>" + command.usage + "</b>: " + command.help + aliases);
        });
        
        addMessage("system", "<hr>");
    }
});

commands.push({
    uses: ["color", "c"],
    usage: "/color [rgb]",
    help: "Changes your text color.",
    args: 1,
    fn: function(args) {
        socket.emit("color", args[0]);
        addMessage("system", "Color changed to <span style='color: rgb(" + args[0] + ")'>" + args[0] + "</span>.");
    }
});

commands.push({
    uses: ["join", "j"],
    usage: "/join [#memo]",
    help: "Joins a memo.",
    args: 1,
    fn: function(args) {
        if(chans.indexOf(args[0]) > -1) {
            selectedchannel = args[0];
            updateChannels();
        } else {
            socket.emit("join", args[0]);
        }
    }
});

commands.push({
    uses: ["part", "p", "leave"],
    usage: "/part [#memo]",
    help: "Leaves a memo.",
    args: 1,
    fn: function(args) {
        socket.emit("part", args[0]);
    }
});

commands.push({
    uses: ["nick", "n"],
    usage: "/nick [nick]",
    help: "Changes your nick (handle).",
    args: 1,
    fn: function(args) {
        socket.emit("nick", args[0]);
    }
});

//TODO
/*
commands.push({
    uses: ["whois", "wi"],
    usage: "/whois [user]",
    help: "Sends a whois request to get information on a user.",
    args: 1,
    fn: function(args) {
        socket.emit("whois", args[0]);
    }
});*/

function parseCommand(input_command) {
    var args = input_command.split(" ");

    input_command = args[0];
    args.shift();

    for(var i = 0; i < commands.length; i++) {
        if(commands[i].uses.indexOf(input_command) > -1) {
            if(args.length >= commands[i].args) {
                commands[i].fn(args);
            } else {
                addMessage("system", "Insufficient arguments.");
            }

            return;
        }
    }

    addMessage("<div class='message message-system'>Command <b>/" + input_command + "</b> not recognized.</div>");
}