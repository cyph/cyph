import {ErrorHandler, Injectable} from '@angular/core';
import {fromError} from 'stacktrace-js';
import {email} from '../util/email';
import {getOrSetDefault} from '../util/get-or-set-default';
import {AnalyticsService} from './analytics.service';
import {EnvService} from './env.service';


/**
 * Handles error logging.
 */
@Injectable()
export class ErrorService implements ErrorHandler {
	/** @ignore */
	private readonly numEmails: Map<string, number>	= new Map<string, number>();

	/** @inheritDoc */
	public handleError (err: any) : void {
		this.log('CYPH ERROR', err, true);
	}

	/** Logs an error. */
	public async log (
		subject: string,
		err?: any,
		requireErrorMessage: boolean = false
	) : Promise<void> {
		const errorMessage: string	= !err ? '' : err.message ? err.message : err.toString();

		if (
			(requireErrorMessage && !errorMessage) ||
			/* Annoying useless iframe-related spam */
			errorMessage === 'Script error.' ||
			/* Google Search iOS app bug */
			errorMessage === "TypeError: null is not an object (evaluating 'elt.parentNode')" ||
			/* Temporary workaround for Firebase Auth issue */
			(this.envService.isIOS && errorMessage === 'Network Error')
		) {
			return;
		}

		const exception: string	=
			`${errorMessage}\n\n${
				err instanceof Error ?
					(await fromError(err)).join('\n') :
					''
			}`.replace(/\/#.*/g, '')
		;

		if (err) {
			/* tslint:disable-next-line:no-console */
			console.error(err);
		}

		const numEmails	= getOrSetDefault(this.numEmails, subject, () => 0) + 1;
		this.numEmails.set(subject, numEmails);

		if (numEmails < 50) {
			email(
				'errors',
				`[${await this.envService.packageName}] ${subject}`,
				exception
			);
		}

		this.analyticsService.sendEvent('exception', {
			exDescription: exception
		});
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
