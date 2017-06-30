/* tslint:disable:no-import-side-effect */

import {Injectable} from '@angular/core';
import * as DOMPurify from 'dompurify';
import {HtmlSanitizerService} from './html-sanitizer.service';


/**
 * HtmlSanitizerService implementation built on DOMPurify.
 * Uses Cure53's DOMPurify href URI scheme whitelist hook, copied from
 * https://github.com/cure53/DOMPurify/blob/master/demos/hooks-scheme-whitelist.html.
 */
@Injectable()
export class DOMPurifyHtmlSanitizerService implements HtmlSanitizerService {
	/** @inheritDoc */
	public sanitize (html: string) : string {
		return DOMPurify.sanitize(html, {FORBID_TAGS: ['style']});
	}

	constructor () {
		/* Allowed URI schemes */
		const whitelist	= ['http', 'https', 'ftp'];

		/* Build fitting regex */
		const regex		= new RegExp(`^(${whitelist.join('|')}):`, 'im');

		/* Add a hook to enforce URI scheme whitelist */
		DOMPurify.addHook('afterSanitizeAttributes', node => {
			/* Build an anchor to map URLs to */
			const anchor: HTMLAnchorElement	= document.createElement('a');

			/* Check all href attributes for validity */
			if (node.hasAttribute('href')) {
				anchor.href	= node.getAttribute('href') || '';
				if (!regex.test(anchor.protocol)) {
					node.removeAttribute('href');
				}
			}

			/* Check all action attributes for validity */
			if (node.hasAttribute('action')) {
				anchor.href	= node.getAttribute('action') || '';
				if (!regex.test(anchor.protocol)) {
					node.removeAttribute('action');
				}
			}

			/* Check all xlink:href attributes for validity */
			if (node.hasAttribute('xlink:href')) {
				anchor.href	= node.getAttribute('xlink:href') || '';
				if (!regex.test(anchor.protocol)) {
					node.removeAttribute('xlink:href');
				}
			}

			/* Block window.opener in new window */
			if (node instanceof HTMLAnchorElement) {
				node.rel	= 'noopener noreferrer';
			}

			return node;
		});
	}
}
