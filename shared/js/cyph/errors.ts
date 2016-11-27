import {Analytics} from './analytics';
import {Util} from './util';


/**
 * Handles errors.
 */
export class Errors {
	/**
	 * Logs generic error (used by self.onerror).
	 * @param errorMessage
	 * @param url
	 * @param line
	 * @param column
	 * @param errorObject
	 */
	public static readonly log			= Errors.baseErrorLog(
		'WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS'
	);

	/**
	 * Logs chat authentication failure (attempted mitm and/or mistyped shared secret).
	 */
	public static readonly logAuthFail	= Errors.baseErrorLog(
		'AUTHENTICATION JUST FAILED FOR SOMEONE LADS'
	);

	/** @ignore */
	private static baseErrorLog (
		subject: string,
		shouldIncludeBootstrapText?: boolean
	) : Function {
		let numEmails	= 0;

		return (
			errorMessage?: string,
			url?: string,
			line?: number,
			column?: number,
			errorObject?: any
		) : void => {
			/* Annoying useless iframe-related spam */
			if (errorMessage === 'Script error.') {
				return;
			}

			const exception: string	= !errorMessage ? '' : (
				errorMessage + '\n\n' +
				'URL: ' + url + '\n' +
				'Line: ' + line.toString() + '\n' +
				'Column: ' + column.toString() + '\n\n' +
				(<string> (errorObject ? errorObject.stack : ''))
			).replace(/\/#.*/g, '');

			if (numEmails++ < 50) {
				Util.email({
					message: exception,
					subject: 'CYPH: ' + subject,
					to: 'errors'
				});
			}

			Analytics.send('exception', {
				exDescription: exception
			});
		};
	}

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	private static readonly _	= (() => {
		self.onerror	= <ErrorEventHandler> Errors.log;
	})();
}
