/// <reference path="../preload/base.ts" />


/* TODO: Replace all these one-off functions with a changeState implementation */

processUrlState	= () => {
	let state	= Util.getUrlState();

	let isPodcast	= $('[ng-show*="podcast =="]').
		map(function () { return $(this).attr('ng-show').split('"')[1] }).
		toArray().
		indexOf(state) > -1
	;

	openPodcast();
	openAbout();
	openTos();
	openPrivacyPolicy();
	openError();

	if (isPodcast) {
		openPodcast(state);
	}
	else if (state === 'about') {
		Util.pushNotFound();
		// openAbout(true);
	}
	else if (state === 'faq') {
		openFaq(true);
	}
	else if (state === 'termsofservice') {
		openTos(true);
	}
	else if (state === 'privacypolicy') {
		openPrivacyPolicy(true);
	}
	else if (state === '404') {
		openError(true);
	}
	else if (state !== '') {
		Util.pushNotFound();
	}
};



/* Redirect to Onion site when on Tor */

if (!Env.isLocalhost && !Env.isOnion) {
	Util.request({
		url: Config.onionUrl + 'ping',
		success: function (data) {
			if (data === 'pong') {
				location.href	= Config.onionUrl + location.toString().split(location.host + '/')[1];
			}
		}
	});
}
