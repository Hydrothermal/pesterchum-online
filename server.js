var web = require("./app/web"),
    irc = require("./app/irc");

irc.initialize({
    lagcheck_frequency: 1000 * 10,
    server: "irc.mindfang.org",
    username: "pcc31",
    realnameprefix: "pco-",
    initial_channels: []
});

web(__dirname);