/// <reference path="../../lib/typings/tsd.d.ts" />

/* Copied from https://github.com/cure53/DOMPurify/blob/master/demos/hooks-scheme-whitelist.html */

// allowed URI schemes
var whitelist = ['http', 'https', 'ftp'];
            
// build fitting regex
var regex = RegExp('^(' + whitelist.join('|') + '):', 'gim');
            
// Add a hook to enforce URI scheme whitelist
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    // check all href attributes for validity
    if (node.hasAttribute('href')) {
        var href = node.getAttribute('href');
        if (!href.match(regex)) {
            node.removeAttribute('href');
        }
    }
    // check all action attributes for validity
    if (node.hasAttribute('action')) {
        var action = node.getAttribute('action');
        if (!action.match(regex)) {
            node.removeAttribute('action');
        }
    }
    // check all xlink:href attributes validity
    if (node.hasAttribute('xlink:href')) {
        var xhref = node.getAttribute('xlink:href');
        if (!xhref.match(regex)) {
            node.removeAttribute('xlink:href');
        }
    }

    return node;
});
