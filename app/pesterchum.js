var irc = require("./irc"),
    helpers = require("./helpers"),
    pesterchum = {
        moods: {
            list: ["chummy", "rancorous", "offline", "pleasant", "distraught", "pranky", "smooth", "ecstatic", "relaxed", "discontent", "devious", "sleek", "detestful", "mirthful", "manipulative", "vigorous", "perky", "acceptant", "protective", "mystified", "amazed", "insolent", "bemused"]
        },
        time: {
            symbols: { c: "current", p: "past", f: "future" }
        }
    };

pesterchum.initials = function(handle) {
    return handle[0].toUpperCase() + (/[A-Z]/.exec(handle) || "");
};

pesterchum.createMessage = function(handle, color, message) {
    return "<c=" + color + ">" + pesterchum.initials(handle) + ": " + message + "</c>";
};

pesterchum.validateHandle = function(handle) {
    return irc.validateNick(handle) && /^[a-z\d]+[A-Z][a-z\d]*$/.test(handle);
};

pesterchum.getMessageType = function(message) {
    if(/<c=.+>.+?:.*<\/c>/.test(message)) {
        return "message";
    }

    if(message.substr(0, 4) === "/me ") {
        return "action";
    }

    if(message.substr(0, 16) === "PESTERCHUM:TIME>") {
        return "time";
    }

    if(message.substr(0, 16) === "PESTERCHUM:BEGIN") {
        return "pester begin";
    }

    if(message.substr(0, 16) === "PESTERCHUM:CEASE") {
        return "pester cease";
    }

    if(message.substr(0, 7) === "COLOR >") {
        return "color";
    }

    if(message.substr(0, 6) === "MOOD >") {
        return "mood";
    }

    if(message.substr(0, 7) === "GETMOOD") {
        return "getmood";
    }

    return "unknown";
};

pesterchum.escapeAndColor = function(message) {
    return helpers.escape(message)
        //Format RGB color tags into CSS syntax
        .replace(/&lt;c=(\d{1,3},\d{1,3},\d{1,3})&gt;/gi, "&lt;c=rgb($1)&gt;")
        //Replace escaped color tags with spans
        .replace(/&lt;c=([^&]*)&gt;/gi, "<span style='color: $1'>")
        .replace(/&lt;\/c&gt;/g, "</span>");
};

pesterchum.parseAction = function(handle, message, time) {
    message = message.substr(4);

    //TODO: Color initials
    return "-- " + pesterchum.time.symbolToWord(time).toUpperCase() + " " + handle +
        " [" + time + pesterchum.initials(handle) + "] " + helpers.escape(message) + " --";
};

pesterchum.getMentions = function(handle) {
    var initials = pesterchum.initials(handle),
        mentions = [new RegExp("\\b" + handle + "\\b", "i")];

    if(initials.length === 2) {
        mentions.push(new RegExp("\\b(" +
            initials + "|" +
            initials[0].toLowerCase() + initials[1] + "|" +
            initials[0] + initials[1].toLowerCase() +
        ")\\b"));
    }

    return mentions;
};

//Time
pesterchum.time.insertIntoMessage = function(time, message) {
    //TODO: Remove this if not needed
    if(time.length > 1) {
        time = pesterchum.time.parseMessage(time);
    }

    //Adds the time symbol next to the first > in the message string
    //This is always the end of the opening color tag in properly-formatted messages
    return message.replace(">", ">" + time);
};

pesterchum.time.createMessage = function(time) {
    if(time === "?") {
        return "PESTERCHUM:TIME>?";
    }

    if(time > 0) {
        time = helpers.pad(time, 4);
        time = time.substr(0, 2) + ":" + time.substr(2);
        return "PESTERCHUM:TIME>F" + time;
    }

    if(time < 0) {
        time = helpers.pad(-time, 4);
        time = time.substr(0, 2) + ":" + time.substr(2);
        return "PESTERCHUM:TIME>P" + time;
    }
    
    return "PESTERCHUM:TIME>i";
};

pesterchum.time.parseMessage = function(message) {
    //Gets the first character after 'PESTERCHUM:TIME>'
    return message.substr(16, 1);
};

pesterchum.time.symbolToWord = function(time) {
    return pesterchum.time.symbols[time.toLowerCase()];
};

//Moods
pesterchum.moods.nameToNum = function(mood) {
    var moodnum = pesterchum.moods.list.indexOf(mood.toLowerCase());

    if(moodnum !== -1) {
        return moodnum;
    }

    console.log("Mood " + mood + " not found; defaulting to 0.");
    return 0;
};

pesterchum.moods.numToName = function(mood) {
    var moodname = pesterchum.moods.list[mood];

    if(moodname) {
        return moodname;
    }

    console.log("Mood number " + mood + " not found; defaulting to chummy.");
    return "chummy";
};

pesterchum.moods.createMessage = function(mood) {
    if(isNaN(mood)) {
        return "MOOD >" + pesterchum.moods.nameToNum(mood);
    }

    return "MOOD >" + mood;
};

pesterchum.moods.parseMessage = function(message, getname) {
    var moodnum;

    try {
        moodnum = parseInt(/MOOD >(\d+)/.exec(message)[1]);
    } catch(e) {
        console.log("Mood message parsing failed when trying to parse '" + message + "'. Defaulting to chummy.");
        moodnum = 0;
    }

    if(getname) {
        return pesterchum.moods.numToName(moodnum);
    }

    return parseInt(moodnum);
};

module.exports = pesterchum;