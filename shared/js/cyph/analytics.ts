/// <reference path="../global/base.ts" />

import {Env} from 'env';
import {Thread} from 'thread';
import {Util} from 'util';
import {Potassium} from 'crypto/crypto';


/**
 * Handles analytics events by calling the Google Analytics SDK in a sandboxed iframe.
 * (https://developers.google.com/analytics/devguides/collection/analyticsjs/events)
 */
export class Analytics {
	private static analFrame: HTMLIFrameElement;
	private static analFrameIsReady: boolean;

	/**
	 * Ignore this (used internally).
	 * @param method
	 * @param args
	 */
	public static baseEventSubmit (method: string, args: any[]) : void {
		if (!Env.isMainThread) {
			Thread.callMainThread('Cyph.Analytics.baseEventSubmit', [method, args]);
		}
		else if (Analytics.analFrameIsReady) {
			args.unshift(method);

			try {
				Analytics.analFrame.contentWindow.postMessage(
					{args: JSON.stringify(args)},
					'*'
				);
			}
			catch (_) {}
		}
		else if (Analytics.analFrameIsReady !== false) {
			/* Do nothing if explicitly set to false */
			setTimeout(() => Analytics.baseEventSubmit(method, args), 50);
		}
	}

	/**
	 * Send event.
	 * @param args
	 */
	public static send (...args: any[]) : void {
		Analytics.baseEventSubmit('send', args);
	}

	/**
	 * Set event.
	 * @param args
	 */
	public static set (...args: any[]) : void {
		Analytics.baseEventSubmit('set', args);
	}

	private static _	= (() => {
		const appName: string		= Env.host;
		const appVersion: string	= Env.isWeb ? 'Web' : 'Native';

		if (Env.isOnion) {
			Analytics.analFrameIsReady	= false;
		}
		else if (Env.isMainThread) {
			try {
				Analytics.analFrame	= document.createElement('iframe');

				Analytics.analFrame.sandbox	= <any> 'allow-scripts allow-same-origin';

				Analytics.analFrame.src	=
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
											return Potassium.toString(Potassium.fromHex(s));
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
											return Potassium.toString(Potassium.fromBase64(s));
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

				Analytics.analFrame.style.display	= 'none';

				document.body.appendChild(Analytics.analFrame);

				$(() =>
					$(Analytics.analFrame).load(() =>
						setTimeout(() => {
							Analytics.analFrameIsReady	= true;
							Analytics.set({appName, appVersion});
						}, 250)
					)
				);
			}
			catch (_) {
				Analytics.analFrameIsReady	= false;
			}
		}
	})();
}
