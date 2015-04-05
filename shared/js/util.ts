var util	= {
	getTimestamp: function () {
		var date	= new Date();
		var hour	= date.getHours();
		var ampm	= 'am';
		var minute	= ('0' + date.getMinutes()).slice(-2);

		if (hour >= 12) {
			hour	-= 12;
			ampm	= 'pm';
		}
		if (hour == 0) {
			hour	= 12;
		}

		return hour + ':' + minute + ampm;
	},

	getUrlState: function (fragmentOnly) {
		var fragment	= document.location.hash.split('#')[1];

		if (fragmentOnly || fragment) {
			return fragment;
		}

		var split	= document.location.pathname.split('/');

		var a	= split.slice(-1)[0];
		var b	= split.slice(-2)[0];

		if (!a && b) {
			return b;
		}
		else {
			return a;
		}
	},

	openUrl: function (url, downloadName, isObjectURL) {
		var a			= document.createElement('a');
		a.href			= url;
		a.target		= '_blank';
		a.style.display	= 'none';

		if (downloadName) {
			a.download	= downloadName;
		}

		document.body.appendChild(a);
		a.click();

		setTimeout(function () {
			document.body.removeChild(a);

			if (isObjectURL) {
				URL.revokeObjectURL(a.href);
			}
		}, 120000);
	},

	pushNotFound: function () {
		util.pushState('/404', false, false);
	},

	pushState: function (path, shouldReplace, shouldNotProcess) {
		if (typeof history != 'undefined') {
			if (shouldReplace) {
				history.replaceState({}, '', path);
			}
			else {
				history.pushState({}, '', path);
			}
		}
		else if (shouldReplace) {
			document.location.replace(path);
			return;
		}
		else {
			document.location.pathname	= path;
			return;
		}

		if (!shouldNotProcess) {
			processUrlState();
		}
	},

	readableByteLength: function (b) {
		var gb	= b / 1.074e+9;
		var mb	= b / 1.049e+6;
		var kb	= b / 1024;

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
	},

	retryUntilSuccessful: function (f, opt_retryIf) {
		var retry;

		var dothemove	= function () { f(retry) };
		retry			= function () {
			if (!opt_retryIf || opt_retryIf()) {
				setTimeout(dothemove, 250);
			}
		};

		dothemove();
	}
};
