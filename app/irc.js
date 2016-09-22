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
    console.log(this.user.getShortCID() + " experienced IRC error:");
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
    this.user.emit("message", from, to, text);
}

function clientPrivateMessage(from, text, message) {
    this.user.emit("pm", from, text);
}

function clientNotice(from, to, text, message) {
    var entrymsg = /^\[(#.+?)\] (.+)/.exec(text);

    if(from === "ChanServ" && entrymsg) {
        this.user.emit("entrymsg", entrymsg[1], entrymsg[2]);
    }
}

function channelNames(channel, names) {
    this.user.emit("names", channel, this.getNames(channel));
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
    client.on("notice", clientNotice);
    client.on("names", channelNames);

    return client;
}

//Extend irc.Client
irc.Client.prototype.sendLagPing = function() {
    //TODO: Consider how to implement updating the lag if the server hasn't responded yet
    this.send("PING", "LAG" + new Date().getTime());
};

irc.Client.prototype.getNames = function(channel) {
    var users = this.chans[channel.toLowerCase()].users,
        list = [];

    for(var user in users) {
        list.push(users[user] + user);
    }

    return list;
};

irc.Client.prototype.getServerName = function(channel) {
    channel = this.chans[channel.toLowerCase()];

    if(channel) {
        return channel.serverName;
    }

    console.log("Tried to get server name for nonexistent channel '" + channel + "'.");
};

module.exports = {
    initialize: function(_config) {
        config = _config;
    },
    createClient: createClient
};