global.crypto	= require('crypto');

require('./js/standalone/global');
require('./js/cyph/dompurify-html-sanitizer');

const {window}	= new (require('jsdom').JSDOM)();

module.exports	= new DOMPurifyHtmlSanitizer(
	require('dompurify')(window),
	window.document
);

module.exports.dompurifyHtmlSanitizer	= module.exports;
global.DOMPurifyHtmlSanitizer			= undefined;
