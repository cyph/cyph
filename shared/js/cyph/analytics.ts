module Cyph {
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
				setTimeout(() =>
					this.baseEventSubmit(method, args)
				, 50);
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
		public constructor (appName: string = Env.host, appVersion: string = 'Web') {
			if (Env.isOnion) {
				this.analFrameIsReady	= false;
			}
			else if (Env.isMainThread) {
				try {
					this.analFrame	= document.createElement('iframe');

					this.analFrame.sandbox	= <any> 'allow-scripts allow-same-origin';

					this.analFrame.src	=
						Env.baseUrl +
						'anal/' +
						appName +
						location.pathname +
						location.search +
						(
							document.referrer &&
							!/https:\/\/www.cyph.[a-z]+\//.test(document.referrer) ?
								(
									(location.search ? '&' : '?') +
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
}
