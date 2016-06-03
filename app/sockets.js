var socketio = require("socket.io"),
    users = require("./users");

function receiveMessage(socket, type, to, message) {
    var fn =
        type === "message" ?
        socket.user.sendFormattedMessage.bind(socket.user) :
        socket.user.sendRawMessage.bind(socket.user);

    fn(to, message);
}

function initialize(io) {
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

        socket.on("message", function(to, message) {
            receiveMessage(socket, "message", to, message);
        });

        socket.on("action", function(to, message) {
            receiveMessage(socket, "action", to, message);
        });

        socket.on("join", function(channel) {
            socket.user.joinChannel(channel);
        });

        socket.on("part", function(channel) {
            socket.user.partChannel(channel);
        });

        socket.on("nick", function(nick) {
            socket.user.changeNick(nick);
        });

        socket.on("names", function(channel) {
            socket.user.getNames(channel);
        });
    });
}

module.exports = initialize;