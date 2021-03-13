import './js/standalone/global.js';
import './js/cyph/dompurify-html-sanitizer.js';

const {window} = new JSDOM();

export const dompurifyHtmlSanitizer = new DOMPurifyHtmlSanitizer(
	DOMPurify(window),
	window.document,
	['http', 'https']
);

export default dompurifyHtmlSanitizer;

global.DOMPurifyHtmlSanitizer = undefined;
