import {Config} from 'config';
import {Env} from 'env';
import {Thread} from 'thread';


/**
 * Miscellaneous helper functions used throughout the codes.
 */
export class Util {
	/**
	 * Sends an email to the Cyph team. "@cyph.com" may be omitted from o.to.
	 * @param o
	 */
	public static email (o: {
		fromEmail?: string;
		fromName?: string;
		to?: string;
		subject?: string;
		message: string;
	}) {
		Util.request({
			method: 'POST',
			url: 'https://mandrillapp.com/api/1.0/messages/send.json',
			data: {
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					from_email: (o.fromEmail || 'test@mandrillapp.com').
						replace('@cyph.com', '@mandrillapp.com')
					,
					from_name: o.fromName || 'Mandrill',
					to: [{
						email: (o.to || 'hello').replace('@cyph.com', '') + '@cyph.com',
						type: 'to'
					}],
					subject: o.subject || 'New Cyph Email',
					text: o.message
				}
			},
			discardErrors: true
		});
	}

	/**
	 * Randomly generates a GUID of specifed length using Config.guidAddressSpace.
	 * If no valid length is specified, Config.guidAddressSpace is ignored and the
	 * GUID will instead append a random 32-bit number to the current datetime.
	 * @param length
	 */
	public static generateGuid (length: number = 0) : string {
		if (length > 0) {
			let guid: string	= '';

			for (let i = 0 ; i < length ; ++i) {
				guid += Config.guidAddressSpace[Util.random(Config.guidAddressSpace.length)];
			}

			return guid;
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
	 * Cryptographically secure replacement for Math.random.
	 * @param max Upper bound.
	 * @param min Lower bound (0 by default).
	 * @returns If max is specified, returns integer in range [min, max);
	 * otherwise, returns float in range [0, 1) (like Math.random).
	 */
	public static random (max?: number, min: number = 0) : number {
		const randomFloat: number	= crypto.getRandomValues(new Uint32Array(1))[0] / Config.maxUint32;

		if (max === undefined) {
			return randomFloat;
		}
		else if (isNaN(max) || max <= 0) {
			throw new Error('Upper bound must be a positive non-zero number.');
		}
		else if (isNaN(min) || min < 0) {
			throw new Error('Lower bound must be a positive number or zero.');
		}
		else if (min >= max) {
			throw new Error('Upper bound must be greater than lower bound.');
		}
		else {
			return Math.floor((randomFloat * (max - min)) + min);
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
		discardErrors?: boolean;
		method?: string;
		responseType?: string;
		retries?: number;
		timeout?: number;
		url: string;
	}) : Promise<any> {
		const async: boolean			= Util.getValue(o, 'async', true) !== false;
		const discardErrors: boolean	= Util.getValue(o, 'discardErrors', false);
		const method: string			= Util.getValue(o, 'method', 'GET');
		const responseType: string		= Util.getValue(o, 'responseType', '');
		const retries: number			= Util.getValue(o, 'retries', 0);
		const timeout: number			= Util.getValue(o, 'timeout', 0);
		let contentType: string			= Util.getValue(o, 'contentType', null);
		let data: any					= Util.getValue<any>(o, 'data', '');
		let url: string					= o.url;

		return new Promise<any>((resolve, reject) => {
			if (url.slice(-5) === '.json') {
				contentType	= 'application/json';
			}
			else if (!responseType || responseType === 'text') {
				contentType	= 'application/x-www-form-urlencoded';
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
					resolve :
					reject
			)(
				xhr.response
			);

			if (async) {
				xhr.onreadystatechange = () => {
					if (xhr.readyState === 4) {
						callback();
					}
				};

				try {
					xhr.timeout = timeout;
				}
				catch (_) {}
			}

			xhr.open(method, url, async);
			xhr.responseType	= responseType;

			if (contentType) {
				xhr.setRequestHeader('Content-Type', contentType);
			}

			xhr.send(data);

			if (!async) {
				callback();
			}
		}).catch(err => {
			if (retries > 0) {
				--o.retries;
				return Util.request(o);
			}
			else if (!discardErrors) {
				throw err;
			}
		});
	}

	/**
	 * Runs f and passes in a function to retry itself.
	 * @param f
	 * @param retryIf If this is specified and returns false, f will not be retried.
	 */
	public static retryUntilComplete (f: Function, retryIf?: Function) : void {
		f((delay: number = 250) : void => {
			if (!retryIf || retryIf()) {
				const go	= () => Util.retryUntilComplete(f, retryIf);
				if (delay >= 0) {
					setTimeout(go, delay);
				}
				else {
					go();
				}
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
