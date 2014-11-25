function processUrlState () {
	var state	= getUrlState();

	var isPodcast	= $('[ng-show*="podcast =="]').
		map(function () { return $(this).attr('ng-show').split('"')[1] }).
		toArray().
		indexOf('penn') > -1
	;

	if (isPodcast) {
		openPodcast(state);
		return;
	}
	
	openPodcast();
}
