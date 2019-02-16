require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/dompurify-html-sanitizer');

module.exports	= new DOMPurifyHtmlSanitizer(
	require('dompurify')(require('jsdom').jsdom().defaultView)
);

module.exports.dompurifyHtmlSanitizer	= module.exports;
global.DOMPurifyHtmlSanitizer			= undefined;
