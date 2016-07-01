var crypto = require("crypto"),
    EventEmitter = require("events"),
    util = require("util"),
    helpers = require("./helpers"),
    pesterchum = require("./pesterchum"),
    irc = require("./irc"),

    users = {};

function generateCID() {
    return crypto.randomBytes(32).toString("hex");
}

function emitChannels() {
    var channels = this.irc.chans;

    for(var channel in channels) {
        this.socket.emit("channel", channels[channel].serverName);
    }
}

//Event handlers
function receiveLag(lag) {
    if(this.socket.connected) {
        this.socket.emit("lag", lag);
    }
}

function receiveChannelMessage(data) {
    var message;

    //TODO: Read actual time instead of hardcoding current
    switch(pesterchum.getMessageType(data.message)) {
        case "message":
            message = pesterchum.time.insertIntoMessage("C", data.message);
            message = pesterchum.escapeAndColor(message);
            this.socket.emit("message", data.from, data.channel, message);
        break;

        case "action":
            message = pesterchum.parseAction(data.from, data.message, "C");
            this.socket.emit("action", data.from, data.channel, message);
        break;

        case "time":
            //TODO: Handle time parsing and storing
        break;

        case "unknown":
            message = helpers.escape(data.message);
            this.socket.emit("ugly message", data.from, data.channel, message);
        break;
    }
}

function receivePrivateMessage(data) {
    var message = pesterchum.escapeAndColor(data.message);

    switch(pesterchum.getMessageType(data.message)) {
        case "unknown":
            this.socket.emit("pm", data.from, data.to, message);
        break;

        case "action":
            this.socket.emit("pm", data.from, data.to, pesterchum.parseAction(data.from, data.message, "C"));
        break;
    }
}

function receiveJoin(nick, channel) {
    if(nick === this.nick()) {
        this.socket.emit("channel", channel);
    } else {
        //TODO: client-side handler for this
        this.socket.emit("joined", nick, channel);
    }
}

function receivePart(nick, channel) {
    if(nick === this.nick()) {
        this.socket.emit("remchannel", channel);
    } else {
        //TODO: client-side handler for this
        this.socket.emit("parted", nick, channel);
    }
}

function updateNick(oldnick, newnick, channels) {
    if(newnick === this.irc.nick) {
        this.socket.emit("nick", newnick);
        console.log(this.getShortCID() + " changed nick from " + oldnick + " to " + newnick + ".");
    } else {
        //TODO: Handle other nick changes
    }
}

function receiveNames(channel, names) {
    this.socket.emit("names", channel, names);
}

//User constructor
function User(nick, iphash) {
    this.cid = generateCID();
    this.color = "255,0,0"; //TODO: fix this
    this.initialnick = nick;
    this.iphash = iphash;

    this.socket = {
        emit: function() {
            console.log(this.getShortCID() + " called socket.emit before socket was connected with arguments: " + Array.prototype.slice.call(arguments) + ".");
        }.bind(this)
    };

    users[this.cid] = this;

    this.on("lag", receiveLag);
    this.on("message", receiveChannelMessage);
    this.on("pm", receivePrivateMessage);
    this.on("joined", receiveJoin);
    this.on("parted", receivePart);
    this.on("nick", updateNick);
    this.on("names", receiveNames);

    console.log("Created user " + this.cid + " with nick " + nick + ".");
}

util.inherits(User, EventEmitter);

//Exposed methods
User.prototype.getShortCID = function() {
    return "[" + this.cid.substr(0, 8) + "]";
};

User.prototype.connectSocket = function(socket) {
    this.socket = socket;
    socket.user = this;

    emitChannels.bind(this)();
    this.irc.sendLagPing();
};

User.prototype.connectIRC = function(cb) {
    this.irc = irc.createClient(this, cb);
};

User.prototype.disconnectIRC = function(message) {
    this.irc.disconnect(message || "Quit");
};

User.prototype.sendMessage = function(to, message) {
    if(to[0] === "#") {
        this.sendFormattedMessage(to, message);
    } else {
        this.sendRawMessage(to, message);
    }
};

User.prototype.sendRawMessage = function(to, message) {
    this.irc.say(to, message);
    
    if(to[0] === "#") {
        receiveChannelMessage.bind(this)({
            from: this.nick(),
            to: to,
            message: message
        });
    } else {
        receivePrivateMessage.bind(this)({
            from: this.nick(),
            to: to,
            message: message
        });
    }
};

User.prototype.sendFormattedMessage = function(to, message) {
    this.sendRawMessage(to, pesterchum.createMessage(this.irc.nick, this.color, message));
};

User.prototype.getTimeMessage = function(channel) {
    //TODO: Allow user-set time
    return pesterchum.time.createMessage();
};

User.prototype.nick = function(initial) {
    if(initial) {
        return this.initialnick;
    }

    return this.irc.nick;
};

User.prototype.joinChannel = function(channel, cb) {
    this.irc.join(channel, cb);
};

User.prototype.partChannel = function(channel, cb) {
    this.irc.part(channel, cb);
};

User.prototype.changeNick = function(nick, cb) {
    this.irc.send("NICK", nick);
};

User.prototype.getNames = function(channel) {
    this.socket.emit("names", this.irc.getServerName(channel), this.irc.getNames(channel));
};

User.prototype.getLag = function() {
    return this.irc.lag;
};

User.prototype.whois = function(nick) {
    var socket = this.socket;

    console.log(this.getShortCID() + " whoised " + nick + ".");

    this.irc.whois(nick, function(data) {
        //TODO: Fix case-sensitive whois
        if(data.host) {
            socket.emit("notice", data.nick + "!" + data.user + "@" + data.host + " :" + data.realname);
        } else {
            socket.emit("notice", "Could not find a user with the handle '" + nick + "'. Remember this command is case-sensitive!");
        }
    });
};

User.prototype.remove = function(dc_message) {
    console.log("Removed user " + this.getShortCID() + ".");

    this.disconnectIRC(dc_message);
    delete users[this.cid];
};

module.exports = {
    User: User,
    users: users,
    getUser: function(cid) {
        return users[cid];
    }
};