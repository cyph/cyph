import * as $ from 'jquery';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {env} from '../env';
import {util} from '../util';


/**
 * Handles analytics events by calling the Google Analytics SDK in a sandboxed iframe.
 * (https://developers.google.com/analytics/devguides/collection/analyticsjs/events)
 */
export class AnalyticsService {
	/** @ignore */
	private analFrame: HTMLIFrameElement;

	/** @ignore */
	private analFrameIsReady: boolean;

	/** @ignore */
	private async baseEventSubmit (method: string, args: any[]) : Promise<void> {
		while (!this.analFrameIsReady) {
			/* Do nothing if explicitly set to false */
			if (this.analFrameIsReady === false) {
				return;
			}

			await util.sleep();
		}

		args.unshift(method);

		try {
			this.analFrame.contentWindow.postMessage(
				{args: JSON.stringify(args)},
				env.baseUrl.slice(0, -1)
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

	constructor () { (async () => {
		const appName: string		= env.host;
		const appVersion: string	= env.isWeb ? 'Web' : 'Native';

		/* TODO: HANDLE NATIVE */
		if (env.isOnion || env.isLocalEnv || !env.isWeb) {
			this.analFrameIsReady	= false;
			return;
		}

		try {
			this.analFrame	= document.createElement('iframe');

			(<any> this.analFrame).sandbox	= 'allow-scripts allow-same-origin';

			this.analFrame.src	=
				env.baseUrl +
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

			this.analFrameIsReady	= true;
			this.setEvent({appName, appVersion});
		}
		catch (_) {
			this.analFrameIsReady	= false;
		}
	})(); }
}
