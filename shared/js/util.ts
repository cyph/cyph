/// <reference path="globals.ts" />


class Util {
	public static getTimestamp () : string {
		var date: Date		= new Date;
		var hour: number	= date.getHours();
		var ampm: string	= 'am';
		var minute: string	= ('0' + date.getMinutes()).slice(-2);

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
		var fragment: string	= document.location.hash.split('#')[1] || '';

		if (fragmentOnly || fragment) {
			return fragment;
		}


		var split: string[]	= document.location.pathname.split('/');

		var a: string	= split.slice(-1)[0] || '';
		var b: string	= split.slice(-2)[0] || '';

		if (!a && b) {
			return b;
		}

		return a;
	}

	public static openUrl (url: string, downloadName?: string) : void {
		var a: any		= document.createElement('a');
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
		var history;

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
			document.location.replace(path);
		}
		else {
			document.location.pathname	= path;
		}
	}

	public static readableByteLength (b: number) : string {
		var gb: number	= b / 1.074e+9;
		var mb: number	= b / 1.049e+6;
		var kb: number	= b / 1024;

		var o	=
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

	public static retryUntilSuccessful (f: Function, retryIf?: Function) : void {
		function dothemove () : void {
			f(retry);
		}

		function retry () : void {
			if (!retryIf || retryIf()) {
				setTimeout(dothemove, 250);
			}
		}

		dothemove();
	}
}
