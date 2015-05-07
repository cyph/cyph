module Cyph {
	/**
	 * Miscellaneous helper functions used throughout the codes.
	 */
	export class Util {
		/**
		 * Breaks up string into array of smaller chunks.
		 * @param s
		 * @param chunkLength
		 */
		public static chunkString (s: string, chunkLength: number) : string[] {
			const array: string[]	= [];

			while (s.length) {
				array.push(s.substr(0, chunkLength));
				s	= s.substr(chunkLength);
			}

			return array;
		}

		/**
		 * Converts JSON string or object into an instance of the specified class.
		 * @param classObject
		 * @param json
		 */
		public static deserializeObject (classObject: any, json: string|any) : any {
			const o: any	= typeof json === 'string' ?
				JSON.parse(json) :
				json
			;

			const newObject: any	= Object.create(classObject.prototype);

			for (const k of Object.keys(o)) {
				newObject[k] = o[k];
			}

			return newObject;
		}

		/**
		 * Randomly generates a GUID of specifed length using Config.guidAddressSpace.
		 * If no valid length is specified, Config.guidAddressSpace is ignored and the
		 * GUID will instead append a random 32-bit number to the current datetime.
		 * @param length
		 */
		public static generateGuid (length: number = 0) : string {
			if (length > 0) {
				return Array.prototype.slice.
					call(
						crypto.getRandomValues(new Uint8Array(length))
					).
					map((n: number) =>
						Config.guidAddressSpace[n % Config.guidAddressSpace.length]
					).
					join('')
				;
			}

			return Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0];
		}

		/**
		 * Returns a human-readable representation of the time (e.g. "3:37pm").
		 */
		public static getTime () : string {
			const date: Date		= new Date();
			const minute: string	= ('0' + date.getMinutes()).slice(-2);
			let hour: number		= date.getHours();
			let ampm: string		= 'am';

			if (hour >= 12) {
				hour	-= 12;
				ampm	= 'pm';
			}
			if (hour === 0) {
				hour	= 12;
			}

			return hour + ':' + minute + ampm;
		}

		/**
		 * Safely tries to extract a value from o,
		 * falling back to defaultValue if it doesn't exist.
		 * @param o
		 * @param keysToTry
		 * @param defaultValue
		 */
		public static getValue<T> (
			o: any,
			keysToTry: string|string[],
			defaultValue: T = null
		) : T {
			if (!o) {
				return defaultValue;
			}

			const keys: string[]	=
				typeof keysToTry === 'string' ?
					[keysToTry] :
					keysToTry
			;

			const value: T	=
				keys.length < 1 ?
					null :
					keys.reduce((value: T, key: string) : T =>
						value !== null ?
							value :
							key in o ?
								o[key] :
								null
					, null)
			;

			return value === null ? defaultValue : value;
		}

		/**
		 * Opens the specified URL.
		 * @param url
		 * @param downloadName Default name if a file is to be downloaded.
		 */
		public static openUrl (url: string, downloadName?: string) : void {
			if (Env.isMainThread) {
				const a: HTMLAnchorElement	= document.createElement('a');

				a.href			= url;
				a.target		= '_blank';
				a.style.display	= 'none';

				if (downloadName) {
					a['download']	= downloadName;
				}

				document.body.appendChild(a);
				a.click();

				setTimeout(() => {
					document.body.removeChild(a);

					try {
						URL.revokeObjectURL(a.href);
					}
					catch (_) {}
				}, 120000);
			}
			else {
				Thread.callMainThread('Cyph.Util.openUrl', [url, downloadName]);
			}
		}

		/**
		 * Converts b into a human-readable representation.
		 * @param b Number of bytes.
		 * @example 32483478 -> "30.97 MB".
		 */
		public static readableByteLength (b: number) : string {
			const gb: number	= b / 1.074e+9;
			const mb: number	= b / 1.049e+6;
			const kb: number	= b / 1024;

			const o	=
				gb >= 1 ?
					{n: gb, s: 'G'} :
					mb >= 1 ?
						{n: mb, s: 'M'} :
						kb >= 1 ?
							{n: kb, s: 'K'} :
							{n: b, s: ''}
			;

			return o.n.toFixed(2) + ' ' + o.s + 'B';
		}

		/**
		 * Performs HTTP requests (drop-in replacement for a subset of jQuery.ajax
		 * without the DOM dependency). Any changes to this method should maintain
		 * strict jQuery.ajax compatibility (http://api.jquery.com/jquery.ajax/).
		 * @param o
		 */
		public static request (o: {
			async?: boolean;
			contentType?: string;
			data?: any;
			error?: Function;
			method?: string;
			success?: Function;
			timeout?: number;
			url: string;
		}) : void {
			const async: boolean	= Util.getValue(o, 'async', true) !== false;
			const error: Function	= Util.getValue(o, 'error', () => {});
			const method: string	= Util.getValue(o, 'method', 'GET');
			const success: Function	= Util.getValue(o, 'success', () => {});
			const timeout: number	= Util.getValue(o, 'timeout', 0);
			let contentType: string	= Util.getValue(o, 'contentType', 'application/x-www-form-urlencoded');
			let data: any			= Util.getValue<any>(o, 'data', '');
			let url: string			= o.url;

			if (url.slice(-5) === '.json') {
				contentType	= 'application/json';
			}

			if (data && method === 'GET') {
				url		+= '?' + (
					typeof data === 'object' ?
						Util.toQueryString(data) :
						data.toString()
				);

				data	= null;
			}
			else if (typeof data === 'object') {
				data	= contentType === 'application/json' ?
					JSON.stringify(data) :
					Util.toQueryString(data)
				;
			}


			const xhr: XMLHttpRequest	= new XMLHttpRequest();

			const callback: Function	= () => (
				xhr.status === 200 ?
					success :
					error
			)(
				xhr.responseText
			);

			if (async) {
				xhr.onreadystatechange = () => {
					if (xhr.readyState === 4) {
						callback();
					}
				};

				xhr.timeout	= timeout;
			}

			try {
				xhr.open(method, url, async);
				xhr.setRequestHeader('Content-Type', contentType);
				xhr.send(data);

				if (!async) {
					callback();
				}
			}
			catch (err) {
				error(err.message);
			}
		}

		/**
		 * Runs f and passes in a function to retry itself.
		 * @param f
		 * @param retryIf If this is specified and returns false, f will not be retried.
		 */
		public static retryUntilComplete (f: Function, retryIf?: Function) : void {
			f((delay: number = 250) : void => {
				if (!retryIf || retryIf()) {
					setTimeout(
						() => Util.retryUntilComplete(f, retryIf),
						delay
					);
				}
			});
		}

		/**
		 * Serialises o to a query string (cf. jQuery.param).
		 * @param o
		 * @param parent Ignore this (internal use).
		 */
		public static toQueryString (o: any, parent?: string) : string {
			return Object.keys(o).
				map((k: string) => {
					const key: string	= parent ? (parent + '[' + k + ']') : k;

					return typeof o[k] === 'object' ?
						Util.toQueryString(o[k], key) :
						(
							encodeURIComponent(key) +
							'=' +
							encodeURIComponent(o[k])
						)
				}).
				join('&').
				replace(/%20/g, '+')
			;
		}

		/**
		 * Attempts to translate text into the user's language.
		 * @param text
		 * @param htmlDecode If true, HTML-decodes the return value.
		 * @param defaultValue Falls back to this if no translation exists.
		 */
		public static translate (
			text: string,
			htmlDecode?: boolean,
			defaultValue: string = text
		) : string {
			if (!Env.isMainThread && htmlDecode) {
				throw new Error('Can only HTML-decode translations in main thread.');
			}

			const translation: string	= Util.getValue(
				Util.getValue(Translations, Env.language, {}),
				text,
				defaultValue
			);

			return htmlDecode ?
				$('<div />').html(translation).text() :
				translation
			;
		}

		/**
		 * Attempts to translate a string of HTML or DOM element into
		 * the user's local language. If translating a DOM element,
		 * translation will both be made in-place and returned as HTML.
		 * @param html
		 */
		public static translateHtml (html: string|HTMLElement) : string {
			if (!Env.isMainThread) {
				if (typeof html === 'string') {
					return html;
				}
				else {
					throw new Error('Can only translate DOM elements in main thread.');
				}
			}

			const $this: JQuery		= $(html);
			const ngBind: string	= $this.attr('ng-bind');
			const innerHtml: string	= $this.html().trim().replace(/\s+/g, ' ');

			for (const attr of ['content', 'placeholder', 'aria-label', 'label']) {
				const value: string	= $this.attr(attr);

				if (value) {
					$this.attr(attr, Util.translate(value, true));
				}
			}

			if (ngBind) {
				$this.attr('ng-bind', ngBind.replace(/"([^"]*)"/g, (match, value) => {
					const translation: string	= Util.translate(value, true, '');

					return translation ?
						'"' + translation + '"' :
						match
					;
				}));
			}

			if (innerHtml) {
				$this.html(innerHtml.replace(/(.*?)(\{\{.*?\}\}|$)/g, (match, value, binding) => {
					const translation: string	= Util.translate(value, true, '');

					return translation ?
						translation + binding :
						match
					;
				}));
			}

			return $this.prop('outerHTML');
		}

		/**
		 * Simulates a click on elem.
		 * @param elem
		 */
		public static triggerClick (elem: HTMLElement) {
			const e: Event	= document.createEvent('MouseEvents');
			e.initEvent('click', true, false);
			elem.dispatchEvent(e);
		}
	}
}
