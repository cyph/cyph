import {DOMPurifyHtmlSanitizer} from '@cyph/sdk';
import DOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';

const {window} = new JSDOM();

export const dompurifyHtmlSanitizer = new DOMPurifyHtmlSanitizer(
	DOMPurify(window),
	window.document,
	['http', 'https']
);
