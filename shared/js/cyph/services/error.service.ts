import {ErrorHandler, Injectable} from '@angular/core';
import {Email} from '../email';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {EnvService} from './env.service';


/**
 * Handles error logging.
 */
@Injectable()
export class ErrorService implements ErrorHandler {
	/**
	 * Logs generic error.
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
				${line === undefined || isNaN(line) ? '' : `Line: ${line.toString()}`}
				${column === undefined || isNaN(column) ? '' : `Column: ${column.toString()}`}

				${!errorObject ? '' : <string> errorObject.stack}
			`.replace(
				/\/#.*/g,
				''
			);

			/* tslint:disable-next-line:no-console */
			console.error(errorObject || exception);

			if (numEmails++ < 50) {
				util.email(new Email(
					'errors',
					`[${this.envService.host}] ${subject}`,
					exception
				));
			}

			this.analyticsService.sendEvent('exception', {
				exDescription: exception
			});
		};
	}

	/** @inheritDoc */
	public handleError (error: any) : void {
		this.log(
			error.message ? error.message : error.toString(),
			locationData.toString(),
			undefined,
			undefined,
			error
		);
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
