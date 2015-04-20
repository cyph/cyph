/// <reference path="config.ts" />
/// <reference path="env.ts" />
/// <reference path="thread.ts" />
/// <reference path="../global/base.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export class Util {
		public static chunkString (s: string, length: number) : string[] {
			let array: string[]	= [];

			while (s.length) {
				array.push(s.substr(0, length));
				s	= s.substr(length);
			}

			return array;
		}

		public static deserializeObject (classObject: any, json: string) : any {
			var o			= JSON.parse(json)
			var newObject	= Object.create(classObject.prototype);

			Object.keys(o).forEach(k => newObject[k] = o[k]);

			return newObject;
		}

		public static generateGuid (length: number = 0) : string {
			if (length > 0) {
				return Array.prototype.slice.call(
					crypto.getRandomValues(new Uint8Array(length))
				).map(n =>
					Config.guidAddressSpace[n % Config.guidAddressSpace.length]
				).join('');
			}

			return Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0];
		}

		public static getTimestamp () : string {
			let date: Date		= new Date;
			let hour: number	= date.getHours();
			let ampm: string	= 'am';
			let minute: string	= ('0' + date.getMinutes()).slice(-2);

			if (hour >= 12) {
				hour	-= 12;
				ampm	= 'pm';
			}
			if (hour === 0) {
				hour	= 12;
			}

			return hour + ':' + minute + ampm;
		}

		public static getUrlState (fragmentOnly?: boolean) : string {
			try {
				let fragment: string	= location.hash.split('#')[1] || '';

				if (fragmentOnly || fragment) {
					return fragment;
				}


				let split: string[]	= location.pathname.split('/');

				let a: string	= split.slice(-1)[0] || '';
				let b: string	= split.slice(-2)[0] || '';

				if (!a && b) {
					return b;
				}

				return a;
			}
			catch (_) {
				return '';
			}
		}

		public static getValue<T> (o: any, keysToTry: string|string[], defaultValue: T = null) : T {
			let keys: string[]	=
				typeof keysToTry === 'string' ?
					[keysToTry] :
					keysToTry
			;

			let value: T	= keys.length > 0 ?
				keys.reduce((value: T, key: string) =>
					value !== null ?
						value :
						key in o ?
							o[key] :
							null
				, null) :
				null
			;

			return value !== null ? value : defaultValue;
		}

		public static openUrl (url: string, downloadName?: string) : void {
			if (Env.isMainThread) {
				let a: any		= document.createElement('a');
				a.href			= url;
				a.target		= '_blank';
				a.style.display	= 'none';

				if (downloadName) {
					a.download	= downloadName;
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

		public static pushNotFound () : void {
			Util.pushState('/404');
		}

		public static pushState (path: string, shouldReplace?: boolean, shouldNotProcess?: boolean) : void {
			if (Env.isMainThread) {
				if (history) {
					if (shouldReplace) {
						history.replaceState({}, '', path);
					}
					else {
						history.pushState({}, '', path);
					}

					if (!shouldNotProcess && processUrlState) {
						processUrlState();
					}
				}
				else if (shouldReplace) {
					location.replace(path);
				}
				else {
					location.pathname	= path;
				}
			}
			else {
				Thread.callMainThread('Cyph.Util.pushState', [path, shouldReplace, shouldNotProcess]);
			}
		}

		public static readableByteLength (b: number) : string {
			let gb: number	= b / 1.074e+9;
			let mb: number	= b / 1.049e+6;
			let kb: number	= b / 1024;

			let o	=
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

		public static request (o: {
			async?: boolean;
			data?: any;
			error?: Function;
			method?: string;
			success?: Function;
			timeout?: number;
			url: string;
		}) : void {
			let async: boolean		= Util.getValue(o, 'async', true) !== false;
			let data: any			= Util.getValue<any>(o, 'data', '');
			let error: Function		= Util.getValue(o, 'error', () => {});
			let method: string		= Util.getValue(o, 'method', 'GET');
			let success: Function	= Util.getValue(o, 'success', () => {});
			let timeout: number		= Util.getValue(o, 'timeout', 0);
			let url: string			= o.url;

			if (method === 'GET') {
				url		+= '?' + (
					typeof data === 'object' ?
						Util.toQueryString(data) :
						data.toString()
				);

				data	= null;
			}
			else if (typeof data === 'object') {
				data	= JSON.stringify(data);
			}


			let xhr: XMLHttpRequest	= new XMLHttpRequest;

			let callback: Function		= () => (
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
			}

			xhr.timeout	= timeout;

			xhr.open(method, url, async);
			xhr.send(data);

			if (!async) {
				callback();
			}
		}

		public static retryUntilComplete (f: Function, retryIf?: Function) : void {
			let go	= () : void =>
				f((delay: number = 250) : void => {
					if (!retryIf || retryIf()) {
						setTimeout(go, delay);
					}
				})
			;

			go();
		}

		public static toQueryString (o: any, parent?: string) : string {
			return Object.keys(o).
				map((k: string) => {
					let key: string	= parent ? (parent + '[' + k + ']') : k;

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

		public static translate (
			text: string,
			ignoreWhitespace?: boolean,
			htmlDecode?: boolean,
			defaultValue: string = text
		) : string {
			if (!Env.isMainThread) {
				if (!htmlDecode) {
					return defaultValue;
				}
				else {
					throw new Error('Can only HTML decode translations in main thread.');
				}
			}

			if (ignoreWhitespace) {
				text	= text.replace(/\s+/g, ' ').trim();
			}

			/* Special cases for our language codes */
			let language: string	=
				Env.language === 'nb' ?
					'no' :
					Env.language === 'zh-cn'?
						'zh-chs' :
						Env.language === 'zh-tw' ?
							'zh-cht' :
							Env.language
			;

			let translation: string	= Util.getValue(
				Util.getValue(Translations || {}, language, {}),
				text,
				defaultValue
			);

			return htmlDecode ?
				$('<div />').html(translation).text() :
				translation
			;
		}

		public static translateHtml (html: string|HTMLElement) : string {
			if (!Env.isMainThread) {
				if (typeof html === 'string') {
					return html;
				}
				else {
					throw new Error('Can only translate DOM elements in main thread.');
				}
			}

			let $this: JQuery		= $(html);
			let ngBind: string		= $this.attr('ng-bind');
			let innerHtml: string	= $this.html().trim();

			['content', 'placeholder', 'aria-label', 'label'].forEach((attr: string) => {
				let value: string	= $this.attr(attr);

				if (value) {
					$this.attr(attr, Util.translate(value, true, true));
				}
			});

			if (ngBind) {
				$this.attr('ng-bind', ngBind.replace(/"([^"]*)"/g, (match, value) => {
					let translation: string	= Util.translate(value, true, true, '');

					return translation ?
						'"' + translation + '"' :
						match
					;
				}));
			}

			if (innerHtml) {
				$this.html(innerHtml.replace(/(.*?)(\{\{.*?\}\}|$)/g, (match, value, binding) => {
					let translation: string	= Util.translate(value, true, true, '');

					return translation ?
						translation + binding :
						match
					;
				}));
			}

			return $this.prop('outerHTML');
		}

		public static triggerClick (elem: HTMLElement) {
			let e: Event	= document.createEvent('MouseEvents');
			e.initEvent('click', true, true);
			elem.dispatchEvent(e);
		}
	}
}
