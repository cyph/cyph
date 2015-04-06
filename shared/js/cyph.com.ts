/* TODO: Replace all these one-off functions with a changeState implementation */

processUrlState	= () => {
	var state	= Util.getUrlState();

	var isPodcast	= $('[ng-show*="podcast =="]').
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
	else if (state == 'about') {
		Util.pushNotFound();
		// openAbout(true);
	}
	else if (state == 'faq') {
		openFaq(true);
	}
	else if (state == 'termsofservice') {
		openTos(true);
	}
	else if (state == 'privacypolicy') {
		openPrivacyPolicy(true);
	}
	else if (state == '404') {
		openError(true);
	}
	else if (state != '') {
		Util.pushNotFound();
	}
};



/* Redirect to Onion site when on Tor */

if (!Env.isLocalhost && !Env.isOnion) {
	$.get(Config.onionUrl + '/ping', function (data) {
		if (data == 'pong') {
			document.location.href	= Config.onionUrl + document.location.toString().split(document.location.host)[1];
		}
	});
}



/* Set Analytics information */

anal.set({
	appName: 'cyph.com',
	appVersion: 'Web'
});
