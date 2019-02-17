global.crypto	= require('crypto');

require('./js/standalone/global');
require('./js/cyph/dompurify-html-sanitizer');

const document	= require('jsdom').jsdom();

module.exports	= new DOMPurifyHtmlSanitizer(
	require('dompurify')(document.defaultView),
	document
);

module.exports.dompurifyHtmlSanitizer	= module.exports;
global.DOMPurifyHtmlSanitizer			= undefined;
