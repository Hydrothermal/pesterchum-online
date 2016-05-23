var irc = require("irc"),

    config;

function updateLag(lag) {
    this.lag = lag;
    this.user.emit("lag", lag);
}

//Event handlers
function clientRaw(message) {
    if(message.command === "PONG") {
        //Lag pongs will take the form of 'LAG' followed by the time that the ping was emitted (see sendLagPing)
        //This removes the first 3 chars and subtracts the current time from the pong time, then updates the lag
        if(message.args[1].substr(0, 3) === "LAG") {
            updateLag.bind(this)(new Date().getTime() - message.args[1].substr(3));
        }
    }
}

function clientRegistered() {
    console.log("Created IRC client " + this.nick + " for " + this.user.getShortCID() + ".");

    if(this.registercb) {
        this.registercb(this.nick);
    }
    
    //Initialize lag detection
    updateLag.bind(this)(new Date().getTime() - this.creation.getTime());
    this.lagpinginterval = setInterval(this.sendLagPing.bind(this), config.lagcheck_frequency);
}

function clientError(error) {
    //TODO: fix this
    console.log(error);
}

function userJoined(channel, nick, message) {
    this.say(channel, this.user.getTimeMessage(channel));
    this.user.emit("joined", nick, channel);
}

function userParted(channel, nick, reason, message) {
    this.user.emit("parted", nick, channel);
}

function userChangedNick(oldnick, newnick, channels, message) {
    this.user.emit("nick", oldnick, newnick, channels);
}

function clientChannelMessage(from, to, text, message) {
    this.user.emit("message", {
        from: from,
        channel: to,
        message: text
    });
}

function clientPrivateMessage(from, text, message) {
    this.user.emit("pm", {
        from: from,
        message: text
    });
}

//Client creation
function createClient(user, callback) {
    var client = new irc.Client(config.server, user.initialnick, {
        userName: config.username,
        realName: config.realnameprefix + user.iphash,
        channels: config.initial_channels.slice()
    });

    client.user = user;
    client.registercb = callback;
    client.creation = new Date();

    client.on("raw", clientRaw);
    client.on("registered", clientRegistered);
    client.on("error", clientError);
    client.on("join", userJoined);
    client.on("part", userParted);
    client.on("nick", userChangedNick);
    client.on("message#", clientChannelMessage);
    client.on("pm", clientPrivateMessage);

    return client;
}

//Extend irc.Client
irc.Client.prototype.sendLagPing = function() {
    //TODO: Consider how to implement updating the lag if the server hasn't responded yet
    this.send("PING", "LAG" + new Date().getTime());
};

module.exports = {
    initialize: function(_config) {
        config = _config;
    },
    validateNick: function(nick) {
        return /^[a-z0-9\\[\]\^_\-|`]{0,30}$/i.test(nick);
    },
    createClient: createClient
};