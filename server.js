var web = require("./app/web"),
    irc = require("./app/irc");

irc.initialize({
    server: "irc.mindfang.org",
    username: "pcc31",
    realnameprefix: "pco-",
    initial_channels: ["#PesterchumOnline"]
});

web(__dirname);