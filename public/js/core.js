function clipString(str, len) {
    len = len || 6;
    return str.length > len ? str.substr(0, len) + "&hellip;" : str;
}