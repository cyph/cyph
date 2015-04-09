/// <reference path="globals.ts" />
/// <reference path="config.ts" />


class Util {
	public static generateGuid (length: number) : string {
		return Array.prototype.slice.call(
			crypto.getRandomValues(new Uint8Array(length))
		).map(n =>
			Config.guidAddressSpace[n % Config.guidAddressSpace.length]
		).join('');
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
		if (hour == 0) {
			hour	= 12;
		}

		return hour + ':' + minute + ampm;
	}

	public static getUrlState (fragmentOnly?: boolean) : string {
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

	public static openUrl (url: string, downloadName?: string) : void {
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

	public static pushNotFound () : void {
		Util.pushState('/404');
	}

	public static pushState (path: string, shouldReplace?: boolean, shouldNotProcess?: boolean) : void {
		let history;

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
}
