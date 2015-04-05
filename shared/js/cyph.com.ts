/* TODO: Replace all these one-off functions with a changeState implementation */

function processUrlState () {
	var state	= getUrlState();

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
		pushState('/404');
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
		pushState('/404');
	}
}



/* Redirect to Onion site when on Tor */

if (!isLocalhost && !isOnion) {
	$.get(ONION_URL + '/ping', function (data) {
		if (data == 'pong') {
			document.location.href	= ONION_URL + document.location.toString().split(document.location.host)[1];
		}
	});
}



/* Set Analytics information */

anal.set({
	appName: 'cyph.com',
	appVersion: 'Web'
});
