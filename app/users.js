var crypto = require("crypto"),
    EventEmitter = require("events"),
    util = require("util"),
    helpers = require("./helpers"),
    pesterchum = require("pesterchum"),
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

function receiveChannelMessage(from, channel, message) {
    var message;

    //TODO: Read actual time instead of hardcoding current
    switch(pesterchum.getMessageType(message)) {
        case "message":
            message = pesterchum.time.insertIntoMessage("C", message);
            message = pesterchum.escapeAndColor(message);
            this.socket.emit("message", channel, message);

            checkMention.bind(this)(channel, message);
        break;

        case "action":
            message = pesterchum.parseAction(from, message, "C");
            this.socket.emit("action", from, channel, message);

            checkMention.bind(this)(channel, message);
        break;

        case "time":
            //TODO: Handle time parsing and storing
        break;

        case "unknown":
            message = helpers.escape(message);
            this.socket.emit("ugly message", from, channel, message);
        break;
    }
}

function receivePrivateMessage(from, message, self) {
    var escaped = pesterchum.escapeAndColor(message),
        tab = from,
        initials;

    if(self) {
        initials = this.initials();
        from = this.nick();
    } else {
        initials = pesterchum.initials(from);
    }

    switch(pesterchum.getMessageType(message)) {
        case "unknown":
            this.socket.emit("pm", tab, initials, escaped);
        break;

        case "pester begin":
        case "pester cease":
        case "color":
            //TODO: Handle beginning/ceasing pesters
            //TODO: Handle color parsing and storing
        break;

        case "action":
            this.socket.emit("pm", tab, null, pesterchum.parseAction(from, escaped, "C"));
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
        this.mentions = pesterchum.getMentions(newnick);
        console.log(this.getShortCID() + " changed nick from " + oldnick + " to " + newnick + ".");
    } else {
        //TODO: Handle other nick changes
    }
}

function receiveNames(channel, names) {
    this.socket.emit("names", channel, names);
}

function receiveEntrymsg(channel, entrymsg) {
    //TODO: Store so that the user can check without having to scroll
    this.socket.emit("message", channel, "[" + channel + "] " + entrymsg);
}

function checkMention(channel, message) {
    for(var i = 0; i < this.mentions.length; i++) {
        if(this.mentions[i].test(message)) {
            this.socket.emit("mention", channel);
            break;
        }
    }
}

function receiveChannelList(list) {
    this.socket.emit("list", list.filter(c => c.name !== "#pesterchum").sort((a, b) => {
        a = a.name.toLowerCase();
        b = b.name.toLowerCase();
        return a < b ? -1 : a > b ? 1 : 0;
    }).map(c => `<span class="channel-name">${c.name}</span><span class="channel-users">${c.users}</span>`));
}

//User constructor
function User(nick, iphash) {
    this.cid = generateCID();
    this.color = "0,0,0";
    this.initialnick = nick;
    this.iphash = iphash;
    this.mentions = pesterchum.getMentions(nick);

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
    this.on("entrymsg", receiveEntrymsg);
    this.on("list", receiveChannelList);

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
        receiveChannelMessage.bind(this)(this.nick(), to, message);
    } else {
        receivePrivateMessage.bind(this)(to, message, true);
    }
};

User.prototype.sendFormattedMessage = function(to, message) {
    this.sendRawMessage(to, pesterchum.createMessage(this.irc.nick, this.color, message));
};

User.prototype.getTimeMessage = function(channel) {
    //TODO: Allow user-set time
    return pesterchum.time.createMessage();
};

User.prototype.nick = function() {
    return this.irc.nick;
};

User.prototype.initials = function() {
    return pesterchum.initials(this.nick());
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

User.prototype.list = function() {
    this.irc.list();
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