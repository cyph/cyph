var noop = function(){};
var UserAgent = {
    set: function (text, success, fail) {
    	text = text||""; // Empty is the same as issuing reset.
        cordova.exec(success||noop, fail||noop, "UserAgent", "set", [text]);
    },
    get: function (success, fail) {
        if (success) {
           cordova.exec(success, fail||noop, "UserAgent", "get", []);
         } else {
           return false;
        }
    },
    reset: function (success, fail) {
        cordova.exec(success||noop, fail||noop, "UserAgent", "reset", []);
    }
};
module.exports = UserAgent;
