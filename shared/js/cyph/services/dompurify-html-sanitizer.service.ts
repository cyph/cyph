import {Injectable} from '@angular/core';
import * as DOMPurify from 'dompurify';
import {BaseProvider} from '../base-provider';
import {DOMPurifyHtmlSanitizer} from '../dompurify-html-sanitizer';
import {HtmlSanitizerService} from './html-sanitizer.service';

/** @see DOMPurifyHtmlSanitizer */
@Injectable()
export class DOMPurifyHtmlSanitizerService
	extends BaseProvider
	implements HtmlSanitizerService
{
	/** @ignore */
	private readonly domPurifyHtmlSanitizer = new DOMPurifyHtmlSanitizer(
		DOMPurify
	);

	/** @inheritDoc */
	public sanitize (html: string) : string {
		return this.domPurifyHtmlSanitizer.sanitize(html);
	}

	constructor () {
		super();
	}
}
