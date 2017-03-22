import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {util} from '../util';
import {EnvService} from './env.service';


/**
 * Handles analytics events by calling the Google Analytics SDK in a sandboxed iframe.
 * (https://developers.google.com/analytics/devguides/collection/analyticsjs/events)
 */
@Injectable()
export class AnalyticsService {
	/** @ignore */
	private analFrame: HTMLIFrameElement;

	/** @ignore */
	private readonly enabled: Promise<boolean>;

	/** @ignore */
	private async baseEventSubmit (method: string, args: any[]) : Promise<void> {
		if (!(await this.enabled)) {
			return;
		}

		args.unshift(method);

		try {
			this.analFrame.contentWindow.postMessage(
				{args: JSON.stringify(args)},
				this.envService.baseUrl.slice(0, -1)
			);
		}
		catch (_) {}
	}

	/**
	 * Send event.
	 * @param args
	 */
	public sendEvent (...args: any[]) : void {
		this.baseEventSubmit('send', args);
	}

	/**
	 * Set event.
	 * @param args
	 */
	public setEvent (...args: any[]) : void {
		this.baseEventSubmit('set', args);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		this.enabled	= Promise.resolve().then(async () => {
			const appName: string		= this.envService.host;
			const appVersion: string	= this.envService.isWeb ? 'Web' : 'Native';

			/* TODO: HANDLE NATIVE */
			if (this.envService.isOnion || this.envService.isLocalEnv || !this.envService.isWeb) {
				throw new Error('Analytics disabled.');
			}

			this.analFrame	= document.createElement('iframe');

			(<any> this.analFrame).sandbox	= 'allow-scripts allow-same-origin';

			this.analFrame.src	=
				this.envService.baseUrl +
				'analsandbox/' +
				appName +
				locationData.pathname +
				locationData.search +
				(
					/* Set referrer except when it's a Cyph URL or an encoded form
						of a Cyph URL, particularly to avoid leaking shared secret */
					(
						document.referrer &&
						![document.referrer].
							concat(
								(
									document.referrer.match(/[0-9a-fA-F]+/g) || []
								).map((s: string) => {
									try {
										return potassiumUtil.toString(potassiumUtil.fromHex(s));
									}
									catch (e) {
										return '';
									}
								})
							).concat(
								(
									'&' + document.referrer.substring(
										document.referrer.indexOf('?') + 1
									)
								).split(/\&.*?=/g).map((s: string) => {
									try {
										return potassiumUtil.toString(potassiumUtil.fromBase64(s));
									}
									catch (e) {
										return '';
									}
								})
							).map((s: string) =>
								/\/\/.*?\.?cyph\.[a-z]+\/?/.test(s)
							).
							reduce((a: boolean, b: boolean) => a || b)
					) ?
						(
							(locationData.search ? '&' : '?') +
							'ref=' +
							encodeURIComponent(document.referrer)
						) :
						''
				)
			;

			this.analFrame.style.display	= 'none';

			document.body.appendChild(this.analFrame);

			await new Promise<void>(resolve => $(() => { resolve(); }));
			await new Promise<void>(resolve =>
				$(this.analFrame).one('load', () => { resolve(); })
			);
			await util.sleep();

			this.setEvent({appName, appVersion});

			return true;
		}).catch(() =>
			false
		);
	}
}
