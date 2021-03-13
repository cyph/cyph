import DOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';
import './buildunbundledassets.js';
import '../shared/assets/js/standalone/global.js';
import '../shared/assets/js/cyph/dompurify-html-sanitizer.js';

const {window} = new JSDOM();

export const dompurifyHtmlSanitizer = new DOMPurifyHtmlSanitizer(
	DOMPurify(window),
	window.document,
	['http', 'https']
);

export default dompurifyHtmlSanitizer;

global.DOMPurifyHtmlSanitizer = undefined;
