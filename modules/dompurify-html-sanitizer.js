require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/dompurify-html-sanitizer');

const document	= require('jsdom').jsdom();

module.exports	= new DOMPurifyHtmlSanitizer(
	require('dompurify')(document.defaultView),
	document
);

module.exports.dompurifyHtmlSanitizer	= module.exports;
global.DOMPurifyHtmlSanitizer			= undefined;
