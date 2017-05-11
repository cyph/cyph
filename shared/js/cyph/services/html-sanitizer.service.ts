import {Injectable} from '@angular/core';


/**
 * Provides HTML sanitization functionality.
 */
@Injectable()
export class HtmlSanitizerService {
	/** Sanitizes a string of HTML. */
	public sanitize (_HTML: string) : string {
		throw new Error('Must provide an implementation of HtmlSanitizerService.sanitize.');
	}

	constructor () {}
}
