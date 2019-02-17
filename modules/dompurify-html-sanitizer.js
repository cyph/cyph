require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/dompurify-html-sanitizer');

const {window}	= new (require('jsdom').JSDOM)();

module.exports	= new DOMPurifyHtmlSanitizer(
	require('dompurify')(window),
	window.document
);

module.exports.dompurifyHtmlSanitizer	= module.exports;
global.DOMPurifyHtmlSanitizer			= undefined;
