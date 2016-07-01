var users = require("./users"),

    forwarded_events = [
        ["message", "sendMessage"],
        ["action", "sendRawMessage"],
        ["join", "joinChannel"],
        ["part", "partChannel"],
        ["nick", "changeNick"],
        ["names", "getNames"],
        ["whois", "whois"]
    ],
    io;

function initialize(_io) {
    io = _io;

    io.on("connection", function(socket) {
        socket.on("register", function(cid) {
            var user = users.getUser(cid);

            console.log(user.getShortCID() + " registered.");

            if(user) {
                user.connectSocket(socket);
                socket.emit("nick", user.nick());
                //socket.emit("channel", "#PesterchumOnline2");
            } else {
                socket.emit("redirect");
            }
        });

        socket.on("disconnect", function() {
            if(socket.user) {
                socket.user.remove();
            }
        });

        socket.on("color", function(color) {
            this.user.color = color;
        });

        forwarded_events.forEach(function(pair) {
            socket.on(pair[0], function() {
                socket.user[pair[1]].apply(socket.user, arguments);
            });
        });
    });
}

module.exports = {
    initialize: initialize,
    broadcast: function(message) {
        io.emit("broadcast", message);
    }
};