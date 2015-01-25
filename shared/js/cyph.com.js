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
