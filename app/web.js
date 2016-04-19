var port = +process.env.PORT || 8080,
    http = require("http"),
    express = require("express"),
    bodyParser = require("body-parser"),
    socketio = require("socket.io"),
    crypto = require("crypto"),
    irc = require("./irc"),
    sockets = require("./sockets"),
    users = require("./users"),

    version = require("../package.json").version,
    app = express(),
    server = http.createServer(app),
    io;

function hashIP(ip) {
    return crypto.createHash("md5").update(ip).digest("hex");
}

function initialize(dir) {
    //Setting stuff up
    app.set("view engine", "ejs");
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.set("views", dir + "/views");
    app.use(express.static(dir + "/public"));

    app.locals = {
        version: version
    };

    io = socketio(server);
    server.listen(port);

    console.log("Server ready on port " + port + ".");

    //Routes
    app.get("/", function(req, res) {
        res.render("index");
    });

    app.post("/chat", function(req, res) {
        var nick = req.body.nick,
            //TODO: test req.ip
            iphash = hashIP(req.headers["x-forwarded-for"] || req.connection.remoteAddress),
            user;

        if(irc.validateNick(nick)) {
            user = new users.User(nick, iphash);

            user.connectIRC(function(nick) {
                res.render("chat", {
                    cid: user.cid
                });
            });
        } else {
            //Invalid handle
            res.redirect("/");
        }
    });

    app.get("/chat", function(req, res) {
        res.redirect("/");
    });

    app.get("/users", function(req, res) {
        var list = [],
            u;

        for(var user in users.users) {
            u = users.users[user];
            list.push("cid: " + user + "\nnick: " + u.nick() + "\nchannels: " + Object.keys(u.irc.chans).join(" "))
        }

        res.type("txt").send(list.length + " users:\n\n" + list.join("\n\n"));
    });

    sockets(io);
}

module.exports = initialize;