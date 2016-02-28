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

    this.socket.emit("pm", data.from, message);
}

function receiveJoin(nick, channel) {
    if(this.socket) {
        if(nick === this.nick()) {
            this.socket.emit("channel", channel);
        } else {
            this.socket.emit("joined", nick, channel);
        }
    }
}

//User constructor
function User(nick, iphash) {
    this.cid = generateCID();
    this.color = "255,0,0"; //TODO: fix this
    this.initialnick = nick;
    this.iphash = iphash;

    users[this.cid] = this;

    this.on("message", receiveChannelMessage);
    this.on("pm", receivePrivateMessage);
    this.on("joined", receiveJoin);

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

    emitChannels.bind(this)(this.irc.channels);
};

User.prototype.connectIRC = function(cb) {
    this.irc = irc.createClient(this, cb);
};

User.prototype.disconnectIRC = function(message) {
    this.irc.disconnect(message || "Quit");
};

User.prototype.sendRawMessage = function(to, message) {
    this.irc.say(to, message);
    
    //TODO: Fix for private messages
    receiveChannelMessage.bind(this)({
        from: this.nick(),
        channel: to,
        message: message
    });
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

User.prototype.remove = function(dc_message) {
    console.log("Removed user " + this.getShortCID() + ".");

    this.disconnectIRC(dc_message);
    delete users[this.cid];
};

module.exports = {
    User: User,
    getUser: function(cid) {
        return users[cid];
    }
};