function clipString(str, len) {
    len = len || 6;
    return str.length > len ? str.substr(0, len) + "&hellip;" : str;
}

function namePrepSort(name) {
    //Convert user status prefix symbols to their respective indices in an array of descending priority
    return name.replace(/[~&@%+]/g, function(x) { return ["~", "&", "@", "%", "+"].indexOf(x); });
}

function sortNames(names) {
    names.sort(function(a, b) {
        a = namePrepSort(a);
        b = namePrepSort(b);

        if(a < b) {
            return -1;
        }

        if(a > b) {
            return 1;
        }

        return 0;
    });

    return names;
};