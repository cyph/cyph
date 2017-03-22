import {Email} from '../email';
import {env} from '../env';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';


/**
 * Handles error logging.
 */
export class ErrorService {
	/**
	 * Logs generic error (used by self.onerror).
	 * @param errorMessage
	 * @param url
	 * @param line
	 * @param column
	 * @param errorObject
	 */
	public readonly log			= this.baseErrorLog('CYPH ERROR', true);

	/**
	 * Logs chat authentication failure (attempted mitm and/or mistyped shared secret).
	 */
	public readonly logAuthFail	= this.baseErrorLog('CYPH AUTHENTICATION FAILURE');

	/** @ignore */
	private baseErrorLog (subject: string, requireErrorMessage?: boolean) : (
		errorMessage?: string,
		url?: string,
		line?: number,
		column?: number,
		errorObject?: any
	) => void {
		let numEmails	= 0;

		return (
			errorMessage?: string,
			url?: string,
			line?: number,
			column?: number,
			errorObject?: any
		) : void => {
			if (
				(requireErrorMessage && !errorMessage) ||
				/* Annoying useless iframe-related spam */
				errorMessage === 'Script error.' ||
				/* Google Search iOS app bug */
				errorMessage === "TypeError: null is not an object (evaluating 'elt.parentNode')"
			) {
				return;
			}

			const exception: string	= !errorMessage ? '' : `
				${errorMessage}

				URL: ${url}
				Line: ${line === undefined || isNaN(line) ? '' : line.toString()}
				Column: ${column === undefined || isNaN(column) ? '' : column.toString()}

				${!errorObject ? '' : <string> errorObject.stack}
			`.replace(
				/\/#.*/g,
				''
			);

			if (numEmails++ < 50) {
				util.email(new Email(
					'errors',
					`[${env.host}] ${subject}`,
					exception
				));
			}

			this.analyticsService.sendEvent('exception', {
				exDescription: exception
			});
		};
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService
	) {
		self.onerror	= this.log;

		try {
			/* tslint:disable-next-line:no-unbound-method */
			const oldConsoleError	= console.error;
			/* tslint:disable-next-line:no-unbound-method */
			console.error			= (errorMessage: string) => {
				oldConsoleError.call(console, errorMessage);
				self.onerror(errorMessage);
			};
		}
		catch (_) {}

		(<any> self).onunhandledrejection	= (e: any) => { self.onerror(e.reason); };
	}
}
