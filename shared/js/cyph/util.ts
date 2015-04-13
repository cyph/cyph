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

		public static getStrings (strings: any) : void {
			Object.keys(strings).forEach((k: string) =>
				strings[k]	= !Env.isMainThread ? '' :
					($('meta[name="' + k + '"]').attr('content') || '').
						replace(/\s+/g, ' ').
						trim()
			);
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

			return (
				keys.length > 0 ?
					keys.reduce((value: T, key: string) =>
						value !== null ?
							value :
							key in o ?
								o[key] :
								null
					, null) :
					null
			) || defaultValue;
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


			let request: XMLHttpRequest	= new XMLHttpRequest;

			let callback: Function		= () => (
				request.status === 200 ?
					success :
					error
			)(
				request.responseText
			);

			if (async) {
				request.onreadystatechange = () => {
					if (request.readyState === 4) {
						callback();
					}
				};
			}

			request.timeout	= timeout;

			request.open(method, url, async);
			request.send(data);

			if (!async) {
				callback();
			}
		}

		public static retryUntilComplete (f: Function, retryIf?: Function) : void {
			let dothemove	= () : void =>
				f((delay: number = 250) : void => {
					if (!retryIf || retryIf()) {
						setTimeout(dothemove, delay);
					}
				})
			;

			dothemove();
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
	}
}
