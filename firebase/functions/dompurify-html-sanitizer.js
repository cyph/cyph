global.crypto	= require('crypto');

require('./js/standalone/global');
require('./js/cyph/dompurify-html-sanitizer');

module.exports	= new DOMPurifyHtmlSanitizer(
	require('dompurify')(require('jsdom').jsdom().defaultView)
);

module.exports.dompurifyHtmlSanitizer	= module.exports;
global.DOMPurifyHtmlSanitizer			= undefined;
