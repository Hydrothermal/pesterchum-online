var port = +process.env.PORT || 8080,
    http = require("http"),
    express = require("express"),
    bodyParser = require("body-parser"),
    socketio = require("socket.io"),
    basicAuth = require("basic-auth"),
    crypto = require("crypto"),
    pesterchum = require("pesterchum"),
    sockets = require("./sockets"),
    users = require("./users"),

    version = require("../package.json").version,
    app = express(),
    server = http.createServer(app),
    io;

function hash(ip) {
    return crypto.createHash("md5").update(ip).digest("hex");
}

function auth(req, res, next) {
    var user = basicAuth(req);

    if(!user || user.name !== process.env.PCO_ADMIN_USERNAME || user.pass !== process.env.PCO_ADMIN_PASSWORD) {
        res.set("WWW-Authenticate", "Basic realm=Pesterchum Online");
        return res.sendStatus(401);
    }

    return next();
};

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
            iphash = hash(req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress),
            user;

        if(pesterchum.validateHandle(nick)) {
            user = new users.User(nick, iphash);

            user.connectIRC(function(nick) {
                res.render("chat", {
                    cid: user.cid
                });
            });
        } else {
            //Invalid handle
            res.redirect("/?err");
        }
    });

    app.get("/chat", function(req, res) {
        res.redirect("/");
    });

    app.get("/users", auth, function(req, res) {
        var list = [],
            u;

        for(var user in users.users) {
            u = users.users[user];
            list.push(
                "cid: " + user + "\n" +
                "iphash: " + u.iphash + "\n" +
                "nick: " + u.nick() + "\n" +
                "lag: " + u.irc.lag + "ms\n" +
                "channels: " + Object.keys(u.irc.chans).join(" ")
            );
        }

        res.type("txt").send(list.length + " users:\n\n" + list.join("\n\n"));
    });

    app.get("/broadcast", auth, function(req, res) {
        res.render("broadcast", {
            message: ""
        });
    });

    app.post("/broadcast", auth, function(req, res) {
        var message = req.body.message;

        if(message) {
            sockets.broadcast(message);
            console.log("Broadcasted \"" + message + "\".");
        }
        
        res.redirect("broadcast");
    });

    sockets.initialize(io);
}

module.exports = initialize;