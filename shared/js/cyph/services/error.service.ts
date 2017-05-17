import {ErrorHandler, Injectable} from '@angular/core';
import {fromError} from 'stacktrace-js';
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
		err?: any
	) => Promise<void> {
		let numEmails	= 0;

		return async (err?: any) : Promise<void> => {
			const errorMessage	= err.message ? err.message : err.toString();

			if (
				(requireErrorMessage && !errorMessage) ||
				/* Annoying useless iframe-related spam */
				errorMessage === 'Script error.' ||
				/* Google Search iOS app bug */
				errorMessage === "TypeError: null is not an object (evaluating 'elt.parentNode')"
			) {
				return;
			}

			const exception: string	= err ?
				(await fromError(err)).join('\n').replace(/\/#.*/g, '') :
				''
			;

			if (err) {
				/* tslint:disable-next-line:no-console */
				console.error(err);
			}

			if (numEmails++ < 50) {
				util.email(
					'errors',
					`[${await this.envService.packageName}] ${subject}`,
					exception
				);
			}

			this.analyticsService.sendEvent('exception', {
				exDescription: exception
			});
		};
	}

	/** @inheritDoc */
	public handleError (err: any) : void {
		this.log(err);
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
