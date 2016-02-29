var irc = require("irc"),
    pesterchum = require("./pesterchum"),

    config;

//Event handlers
function clientRegistered() {
    console.log("Created IRC client " + this.nick + " for " + this.user.getShortCID() + ".");
    this.registercb(this.nick);
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

    client.on("registered", clientRegistered);
    client.on("error", clientError);
    client.on("join", userJoined);
    client.on("part", userParted);
    client.on("nick", userChangedNick);
    client.on("message#", clientChannelMessage);
    client.on("pm", clientPrivateMessage);

    return client;
}

module.exports = {
    initialize: function(_config) {
        config = _config;
    },
    validateNick: function(nick) {
        return /^[a-z0-9\\[\]\^_\-|`]{0,30}$/i.test(nick);
    },
    createClient: createClient
};