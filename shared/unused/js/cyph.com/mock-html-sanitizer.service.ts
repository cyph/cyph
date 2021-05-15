import {Injectable} from '@angular/core';
import {BaseProvider} from '../cyph/base-provider';
import {HtmlSanitizerService} from '../cyph/services/html-sanitizer.service';

/**
 * Mocks HTML sanitizer service.
 */
@Injectable()
export class MockHtmlSanitizerService
	extends BaseProvider
	implements HtmlSanitizerService
{
	/** Just a noop; returns the exact same HTML without doing anything to it. */
	public sanitize (html: string) : string {
		return html;
	}

	constructor () {
		super();
	}
}
