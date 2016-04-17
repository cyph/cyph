import {Env} from 'env';
import {Thread} from 'thread';
import {Util} from 'util';
import {locationData, Sodium} from 'global/base';


/**
 * Handles analytics events by calling the Google Analytics SDK in a sandboxed iframe.
 * (https://developers.google.com/analytics/devguides/collection/analyticsjs/events)
 */
export class Analytics {
	/** Default instance of Analytics. */
	public static main	= new Analytics();


	private analFrame: HTMLIFrameElement;
	private analFrameIsReady: boolean;

	/**
	 * Ignore this (used internally).
	 * @param method
	 * @param args
	 */
	public baseEventSubmit (method: string, args: any[]) : void {
		if (!Env.isMainThread) {
			Thread.callMainThread('Cyph.Analytics.main.baseEventSubmit', [method, args]);
		}
		else if (this.analFrameIsReady) {
			args.unshift(method);

			try {
				this.analFrame.contentWindow.postMessage(
					{args: JSON.stringify(args)},
					'*'
				);
			}
			catch (_) {}
		}
		else if (this.analFrameIsReady !== false) {
			/* Do nothing if explicitly set to false */
			setTimeout(() => this.baseEventSubmit(method, args), 50);
		}
	}

	/**
	 * Send event.
	 * @param args
	 */
	public send (...args: any[]) : void {
		this.baseEventSubmit('send', args);
	}

	/**
	 * Set event.
	 * @param args
	 */
	public set (...args: any[]) : void {
		this.baseEventSubmit('set', args);
	}

	/**
	 * @param appName
	 * @param appVersion
	 */
	public constructor (
		appName: string = Env.host,
		appVersion: string = Env.isWeb ? 'Web' : 'Native'
	) {
		if (Env.isOnion) {
			this.analFrameIsReady	= false;
		}
		else if (Env.isMainThread) {
			try {
				this.analFrame	= document.createElement('iframe');

				this.analFrame.sandbox	= <any> 'allow-scripts allow-same-origin';

				this.analFrame.src	=
					Env.baseUrl +
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
											return Sodium.to_string(Sodium.from_hex(s));
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
											return Sodium.to_string(Sodium.from_base64(s));
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

				$(() =>
					$(this.analFrame).load(() =>
						setTimeout(() => {
							this.analFrameIsReady	= true;
							this.set({appName, appVersion});
						}, 250)
					)
				);
			}
			catch (_) {
				this.analFrameIsReady	= false;
			}
		}
	}
}
