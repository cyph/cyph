function processUrlState () {
	var state	= getUrlState();

	var isPodcast	= $('[ng-show*="podcast =="]').
		map(function () { return $(this).attr('ng-show').split('"')[1] }).
		toArray().
		indexOf(state) > -1
	;

	if (isPodcast) {
		openPodcast(state);
		return;
	}
	else {
		openPodcast();
	}

	if (state == '404') {
		error(true);
	}
	else if (state != '') {
		pushState('/404');
		return;
	}
	else {
		error();
	}
}
