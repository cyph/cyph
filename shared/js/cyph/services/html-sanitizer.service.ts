import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';


/**
 * Provides HTML sanitization functionality.
 */
@Injectable()
export class HtmlSanitizerService extends BaseProvider {
	/** Sanitizes a string of HTML. */
	public sanitize (_HTML: string) : string {
		throw new Error('Must provide an implementation of HtmlSanitizerService.sanitize.');
	}

	constructor () {
		super();
	}
}
